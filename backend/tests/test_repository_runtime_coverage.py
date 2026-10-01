import importlib
import pkgutil
import base64
import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import config, database, models
from app.auth import AuthService, get_password_hash, verify_password
from app.repositories.base_repository import BaseRepository
from app.repositories.user_repository import UserRepository
from app.schemas import AprendizUpdate, NotificacionCreate, PasswordChange, UserCreate, UserUpdate
from db_support import db_path_for, sqlite_url_for


@pytest.fixture
def database_session(tmp_path):
    engine = create_engine(
        sqlite_url_for(db_path_for(f"repository-{tmp_path.name}.db")),
        connect_args={"check_same_thread": False},
    )
    models.Base.metadata.create_all(bind=engine)
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


class DictInput:
    def __init__(self, **values):
        self.values = values

    def dict(self, exclude_unset=False):
        return dict(self.values)


def test_base_repository_executes_crud_and_returns_results(database_session):
    repo = BaseRepository(models.User, database_session)
    created = repo.create(
        DictInput(
            email="repo-user@sena.edu.co",
            password_hash="hash",
            nombre="Usuario inicial",
            rol="investigador",
            is_active=True,
        )
    )

    assert repo.get_by_id(created.id).email == "repo-user@sena.edu.co"
    assert repo.list(skip=0, limit=1) == [created]
    updated = repo.update(created, DictInput(nombre="Usuario actualizado"))
    assert updated.nombre == "Usuario actualizado"
    assert repo.delete(created.id) is True
    assert repo.get_by_id(created.id) is None
    assert repo.delete(created.id) is False


def test_repository_subclasses_bind_each_entity(database_session):
    import app.repositories as repository_package

    bound_models = {}
    for module_info in pkgutil.iter_modules(repository_package.__path__):
        module = importlib.import_module(f"{repository_package.__name__}.{module_info.name}")
        for candidate in vars(module).values():
            if (
                isinstance(candidate, type)
                and candidate is not BaseRepository
                and issubclass(candidate, BaseRepository)
                and candidate.__module__ == module.__name__
            ):
                repository = candidate(database_session)
                bound_models[candidate.__name__] = repository.model

    assert len(bound_models) == 13
    assert "BitacoraEntryRepository" not in bound_models
    assert bound_models["UserRepository"] is models.User
    assert bound_models["ProyectoRepository"] is models.Proyecto
    assert bound_models["ActividadRepository"] is models.Actividad


def test_user_repository_search_filters_and_hashes_password(database_session):
    repository = UserRepository(database_session)
    active = repository.create(
        UserCreate(
            email="persona.activa@sena.edu.co",
            password="clave-segura-123",
            nombre="Persona Activa",
            rol="investigador",
            is_active=True,
        )
    )
    repository.create(
        UserCreate(
            email="aprendiz.inactivo@sena.edu.co",
            password="clave-segura-456",
            nombre="Aprendiz Inactivo",
            rol="aprendiz",
            is_active=False,
        )
    )

    assert repository.get_by_email(active.email).id == active.id
    assert repository.list_users(rol="investigador", is_active=True, search="Persona") == [active]
    assert repository.list_users(rol="aprendiz", is_active=False, search="Inactivo")[0].rol == "aprendiz"
    assert verify_password("clave-segura-123", active.password_hash)


def test_runtime_helpers_cover_redis_database_and_sqlite_array(monkeypatch):
    with_password = config.Settings(
        REDIS_HOST="redis.internal",
        REDIS_PORT="6381",
        REDIS_PASSWORD="clave",
        REDIS_DB=4,
    )
    without_password = config.Settings(
        REDIS_HOST="localhost",
        REDIS_PORT="6380",
        REDIS_PASSWORD="",
        REDIS_DB=0,
    )
    assert with_password.REDIS_URL == "redis://:clave@redis.internal:6381/4"
    assert without_password.REDIS_URL == "redis://localhost:6380/0"

    class TrackedSession:
        closed = False

        def close(self):
            self.closed = True

    session = TrackedSession()
    monkeypatch.setattr(database, "SessionLocal", lambda: session)
    dependency = database.get_db()
    assert next(dependency) is session
    with pytest.raises(StopIteration):
        next(dependency)
    assert session.closed is True

    monkeypatch.setattr(models, "is_sqlite", True)
    sentinel_json = object()
    monkeypatch.setattr(models, "JSON", sentinel_json)
    assert models.ARRAY(models.String) is sentinel_json
    monkeypatch.setattr(models, "is_sqlite", False)
    assert isinstance(models.ARRAY(models.String), models.PostgresARRAY)


def test_production_health_helpers_return_expected_payloads():
    from starlette.requests import Request
    from app.main import debug_headers, root

    root_payload = root()
    assert root_payload["status"] == "online"
    assert root_payload["docs"] == "/docs"
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "scheme": "http",
            "path": "/debug-headers",
            "query_string": b"",
            "headers": [(b"x-role", b"investigador")],
            "server": ("testserver", 80),
            "client": ("127.0.0.1", 1234),
        }
    )
    response = debug_headers(request)
    assert response["headers"]["x-role"] == "investigador"
    assert response["method"] == "GET"
    assert response["url"].endswith("/debug-headers")


def test_auth_profile_password_and_admin_handlers(database_session):
    from fastapi import HTTPException
    from app.routers import auth as auth_router

    admin = models.User(
        id="10000000-0000-0000-0000-000000000001",
        email="global-admin@sena.edu.co",
        password_hash=get_password_hash("clave-vieja-123"),
        nombre="Administradora",
        rol="admin",
        is_active=True,
    )
    target = models.User(
        id="10000000-0000-0000-0000-000000000002",
        email="global-target@sena.edu.co",
        password_hash=get_password_hash("clave-inicial-123"),
        nombre="Persona inicial",
        rol="investigador",
        is_active=True,
    )
    database_session.add_all([admin, target])
    database_session.commit()

    updated_me = auth_router.update_me(
        UserUpdate(nombre="Nombre actualizado"),
        current_user=target,
        db=database_session,
    )
    assert updated_me.nombre == "Nombre actualizado"
    with pytest.raises(HTTPException) as wrong_password:
        auth_router.change_password(
            PasswordChange(old_password="incorrecta", new_password="clave-nueva-123"),
            current_user=target,
            db=database_session,
        )
    assert wrong_password.value.status_code == 400
    password_result = auth_router.change_password(
        PasswordChange(old_password="clave-inicial-123", new_password="clave-nueva-123"),
        current_user=target,
        db=database_session,
    )
    assert password_result["message"] == "Contraseña actualizada correctamente"
    assert verify_password("clave-nueva-123", target.password_hash)

    assert [user.id for user in auth_router.list_users(rol="investigador", admin=admin, db=database_session)] == [target.id]
    assert auth_router.get_user(str(target.id), admin=admin, db=database_session).email == target.email
    assert auth_router.update_user(
        str(target.id), UserUpdate(nombre="Editada por admin"), admin=admin, db=database_session
    ).nombre == "Editada por admin"
    assert auth_router.delete_user(str(target.id), admin=admin, db=database_session)["message"] == "Usuario desactivado"
    assert target.is_active is False

    missing_id = "10000000-0000-0000-0000-000000000099"
    with pytest.raises(HTTPException) as missing_get:
        auth_router.get_user(missing_id, admin=admin, db=database_session)
    assert missing_get.value.status_code == 404
    with pytest.raises(HTTPException) as missing_update:
        auth_router.update_user(missing_id, UserUpdate(nombre="Inexistente"), admin=admin, db=database_session)
    assert missing_update.value.status_code == 404
    with pytest.raises(HTTPException) as missing_delete:
        auth_router.delete_user(missing_id, admin=admin, db=database_session)
    assert missing_delete.value.status_code == 404


def test_auth_service_changes_password_and_commits(database_session):
    user = models.User(
        id="11000000-0000-0000-0000-000000000001",
        email="auth-service@sena.edu.co",
        password_hash=get_password_hash("clave-anterior-123"),
        nombre="Usuario de autenticación",
        rol="investigador",
    )
    database_session.add(user)
    database_session.commit()

    AuthService.change_password(database_session, user, "clave-nueva-456")
    database_session.expire(user)
    assert verify_password("clave-nueva-456", user.password_hash)


def test_cvlac_access_and_status_handlers(database_session):
    from fastapi import HTTPException
    from app.routers import cvlac as cvlac_router

    admin = models.User(
        id="20000000-0000-0000-0000-000000000001",
        email="cvlac-admin@sena.edu.co",
        password_hash="hash",
        nombre="Administradora",
        rol="admin",
    )
    investigator = models.User(
        id="20000000-0000-0000-0000-000000000002",
        email="cvlac-investigator@sena.edu.co",
        password_hash="hash",
        nombre="Investigador pendiente",
        rol="investigador",
        estado_cv_lac="No actualizado",
    )
    other_user = models.User(
        id="20000000-0000-0000-0000-000000000003",
        email="cvlac-other@sena.edu.co",
        password_hash="hash",
        nombre="Otra persona",
        rol="investigador",
    )
    database_session.add_all([admin, investigator, other_user])
    database_session.commit()

    with pytest.raises(HTTPException) as forbidden_list:
        cvlac_router.get_usuarios_sin_cvlac(current_user=investigator, db=database_session)
    assert forbidden_list.value.status_code == 403
    pending = cvlac_router.get_usuarios_sin_cvlac(current_user=admin, db=database_session)
    assert [user.id for user in pending] == [investigator.id]

    own_status = cvlac_router.get_user_cvlac_status(
        str(investigator.id), current_user=investigator, db=database_session
    )
    assert own_status["estado"] == "No actualizado"
    with pytest.raises(HTTPException) as forbidden_status:
        cvlac_router.get_user_cvlac_status(
            str(investigator.id), current_user=other_user, db=database_session
        )
    assert forbidden_status.value.status_code == 403
    with pytest.raises(HTTPException) as missing_status:
        cvlac_router.get_user_cvlac_status(
            "20000000-0000-0000-0000-000000000099", current_user=admin, db=database_session
        )
    assert missing_status.value.status_code == 404


def test_document_handlers_return_only_authorized_records(database_session, monkeypatch, tmp_path):
    from fastapi import HTTPException
    from app.routers import documentos as documentos_router

    owner = models.User(
        id="30000000-0000-0000-0000-000000000001",
        email="document-owner@sena.edu.co",
        password_hash="hash",
        nombre="Propietario",
        rol="investigador",
    )
    stranger = models.User(
        id="30000000-0000-0000-0000-000000000002",
        email="document-stranger@sena.edu.co",
        password_hash="hash",
        nombre="Usuario ajeno",
        rol="aprendiz",
    )
    project = models.Proyecto(
        id="30000000-0000-0000-0000-000000000003",
        nombre="Proyecto propietario",
        owner_id=owner.id,
    )
    document = models.Documento(
        id="30000000-0000-0000-0000-000000000004",
        entidad_tipo="user",
        entidad_id=owner.id,
        tipo="cvlac_pdf",
        nombre_archivo="cvlac.pdf",
        content_type="application/pdf",
        data_base64=base64.b64encode(b"pdf de prueba").decode("ascii"),
        owner_id=owner.id,
    )
    project_document = models.Documento(
        id="30000000-0000-0000-0000-000000000005",
        entidad_tipo="proyecto",
        entidad_id=project.id,
        tipo="informe",
        nombre_archivo="informe.pdf",
        content_type="application/pdf",
        data_base64="",
        owner_id=owner.id,
    )
    database_session.add_all([owner, stranger, project, document, project_document])
    database_session.commit()
    monkeypatch.setattr(documentos_router.os.path, "exists", lambda _path: False)

    inline = documentos_router.view_documento(str(document.id), current_user=owner, db=database_session)
    assert inline.body == b"pdf de prueba"
    assert documentos_router.get_documento(str(document.id), current_user=owner, db=database_session).id == document.id
    cvlac = documentos_router.get_user_cvlac(current_user=owner, db=database_session)
    assert base64.b64decode(cvlac["data_base64"]) == b"pdf de prueba"
    listed = documentos_router.get_proyecto_documentos(str(project.id), current_user=owner, db=database_session)
    assert [item.id for item in listed] == [project_document.id]

    with pytest.raises(HTTPException) as denied:
        documentos_router.get_documento(str(document.id), current_user=stranger, db=database_session)
    assert denied.value.status_code == 403
    with pytest.raises(HTTPException) as missing_project:
        documentos_router.get_proyecto_documentos(
            "30000000-0000-0000-0000-000000000099", current_user=owner, db=database_session
        )
    assert missing_project.value.status_code == 404


def test_attachment_policy_rejects_binary_text_and_oversized_files():
    from app.services import attachment_policy

    assert attachment_policy._es_texto(b"contenido UTF-8") is True
    assert attachment_policy._es_texto(b"contiene\x00binario") is False
    assert attachment_policy._es_texto(b"\xff") is False
    limit = attachment_policy.limite_bytes("documento")
    attachment_policy.verificar_tamano("documento", limit)
    with pytest.raises(attachment_policy.ArchivoDemasiadoGrande):
        attachment_policy.verificar_tamano("documento", limit + 1)


def test_orphan_attachment_maintenance_returns_real_database_counts(database_session):
    from app.services import adjuntos_service

    assert adjuntos_service.contar_huerfanos(database_session) == 0
    assert adjuntos_service.purgar_huerfanos(database_session) == 0


def test_real_time_broadcaster_delivers_to_each_connected_user():
    from app.services.realtime_broadcaster import MessageBroadcaster

    broadcaster = MessageBroadcaster()

    async def scenario():
        first_queue = await broadcaster.connect("first-user")
        second_queue = await broadcaster.connect("second-user")
        assert broadcaster.is_user_online("first-user")
        await broadcaster.broadcast_to_users(
            ["first-user", "second-user", None], "status", {"ready": True}
        )
        first_event = first_queue.get_nowait()
        second_event = second_queue.get_nowait()
        assert first_event["event"] == second_event["event"] == "status"
        assert first_event["data"] == second_event["data"] == {"ready": True}
        await broadcaster.disconnect("first-user", first_queue)
        await broadcaster.disconnect("second-user", second_queue)
        assert not broadcaster.is_user_online("first-user")

    asyncio.run(scenario())


def test_audit_exports_and_statistics_report_real_records(database_session):
    from app.routers import audit as audit_router
    from app.routers import stats as stats_router

    admin = models.User(
        id="40000000-0000-0000-0000-000000000001",
        email="audit-admin@sena.edu.co",
        password_hash="hash",
        nombre="Administradora de auditoría",
        rol="admin",
    )
    database_session.add(admin)
    database_session.flush()
    activity = models.Actividad(
        user_id=admin.id,
        tipo_accion="prueba",
        descripcion="Acción de auditoría de prueba",
        ip_address="127.0.0.1",
    )
    log = models.AuditLog(
        user_id=admin.id,
        method="POST",
        endpoint="/api/prueba",
        status_code=201,
        ip_address="127.0.0.1",
        user_agent="pytest",
        payload_snapshot={"ok": True},
    )
    database_session.add_all([activity, log])
    database_session.commit()

    async def read_response(response):
        return b"".join([chunk async for chunk in response.body_iterator])

    activity_csv = asyncio.run(
        read_response(audit_router.export_audit_csv(tipo="actividades", admin=admin, db=database_session))
    ).decode("utf-8-sig")
    logs_csv = asyncio.run(
        read_response(audit_router.export_audit_csv(tipo="logs", admin=admin, db=database_session))
    ).decode("utf-8-sig")
    assert "Acción de auditoría de prueba" in activity_csv
    assert "/api/prueba" in logs_csv

    result = stats_router.get_audit_logs(admin=admin, db=database_session, method="post")
    assert result["total"] == 1
    assert result["logs"][0]["payload_snapshot"] == {"ok": True}
    summary = stats_router.get_audit_summary(admin=admin, db=database_session)
    assert summary["total_logs"] == 1
    assert summary["logs_ultimos_7_dias"] == 1


def test_notifications_are_created_counted_scoped_and_expired(database_session):
    from app.routers import notificaciones as notifications_router

    admin = models.User(
        id="50000000-0000-0000-0000-000000000001",
        email="notifications-admin@sena.edu.co",
        password_hash="hash",
        nombre="Administradora",
        rol="admin",
    )
    instructor = models.User(
        id="50000000-0000-0000-0000-000000000002",
        email="notifications-instructor@sena.edu.co",
        password_hash="hash",
        nombre="Instructor",
        rol="investigador",
        estado_cv_lac="Desactualizado",
    )
    learner = models.User(
        id="50000000-0000-0000-0000-000000000003",
        email="notifications-learner@sena.edu.co",
        password_hash="hash",
        nombre="Aprendiz",
        rol="aprendiz",
    )
    database_session.add_all([admin, instructor, learner])
    database_session.commit()

    message_result = notifications_router.enviar_mensaje_usuario(
        NotificacionCreate(
            user_id=UUID(str(learner.id)),
            tipo="mensaje",
            titulo="Consulta de proyecto",
            mensaje="Revisa el avance del proyecto.",
        ),
        current_user=instructor,
        db=database_session,
    )
    assert message_result["message"] == "Mensaje enviado exitosamente"
    unread = notifications_router.check_notificaciones_pendientes(
        current_user=learner, db=database_session
    )
    assert unread == {"no_leidas": 1, "tiene_notificaciones": True}

    old_read = models.Notificacion(
        user_id=learner.id,
        tipo="sistema",
        titulo="Leída antigua",
        mensaje="Debe eliminarse al superar el plazo.",
        leida=True,
        created_at=datetime.now(timezone.utc) - timedelta(days=60),
    )
    database_session.add(old_read)
    database_session.commit()
    cleanup = notifications_router.limpiar_notificaciones_leidas(
        dias_retencion=30, current_user=learner, db=database_session
    )
    assert cleanup["eliminadas"] == 1

    mass_result = notifications_router.enviar_notificacion_masiva(
        titulo="Aviso institucional",
        mensaje="Mensaje al personal.",
        admin=admin,
        db=database_session,
    )
    assert mass_result["total_destinatarios"] == 1
    alert_result = notifications_router.alertar_cvlac_desactualizados(
        admin=admin, db=database_session
    )
    assert alert_result["total_notificados"] == 1
    pending = notifications_router.get_cvlac_pendientes(admin=admin, db=database_session)
    assert pending["total_pendientes"] == 1
    assert pending["investigadores"][0]["nombre"] == "Instructor"


def test_admin_password_reset_and_user_activity_are_observable(database_session):
    from app.routers import usuarios as users_router

    admin = models.User(
        id="60000000-0000-0000-0000-000000000001",
        email="user-activity-admin@sena.edu.co",
        password_hash="hash",
        nombre="Administradora",
        rol="admin",
    )
    target = models.User(
        id="60000000-0000-0000-0000-000000000002",
        email="user-activity-target@sena.edu.co",
        password_hash="hash",
        nombre="Usuario consultado",
        rol="investigador",
    )
    database_session.add_all([admin, target])
    database_session.commit()

    reset = users_router.reset_password(
        str(target.id), "clave-restablecida", admin=admin, db=database_session
    )
    assert reset["message"] == "Contraseña actualizada"
    assert verify_password("clave-restablecida", target.password_hash)
    activity = users_router.get_user_actividad(str(target.id), admin=admin, db=database_session)
    assert activity["usuario"]["email"] == target.email
    assert activity["proyectos_creados"] == 0


def test_project_deliverable_and_product_summary_routes(database_session):
    from app.routers import entregables as deliverables_router
    from app.routers import plantillas as templates_router
    from app.routers import productos_stats as products_router
    from app.routers import retos as ideas_router

    owner = models.User(
        id="70000000-0000-0000-0000-000000000001",
        email="coverage-owner@sena.edu.co",
        password_hash="hash",
        nombre="Dueño del proyecto",
        rol="investigador",
    )
    database_session.add(owner)
    project = models.Proyecto(
        id="70000000-0000-0000-0000-000000000002",
        nombre="Proyecto de cobertura",
        estado="Aprobado",
        owner_id=owner.id,
        created_at=datetime.now(timezone.utc),
    )
    database_session.add(project)
    database_session.commit()

    generated = templates_router.generar_cronograma_sennova(
        str(project.id), db=database_session, current_user=owner
    )
    assert generated == {"status": "success", "entregables_creados": 6}
    assert database_session.query(models.Entregable).filter_by(proyecto_id=project.id).count() == 6
    repeated = templates_router.generar_cronograma_sennova(
        str(project.id), db=database_session, current_user=owner
    )
    assert repeated["entregables_creados"] == 0

    next_deliverables = deliverables_router.entregables_proximos(
        dias=30, current_user=owner, db=database_session
    )
    assert next_deliverables["total"] == 1
    assert next_deliverables["entregables"][0]["proyecto_nombre"] == project.nombre
    assert products_router.get_mis_productos(current_user=owner, db=database_session) == []
    assert ideas_router.listar_retos(current_user=owner, db=database_session) == []


def test_group_project_and_plan_routes_save_and_return_file(database_session, monkeypatch, tmp_path):
    from types import SimpleNamespace
    from starlette.datastructures import UploadFile
    from app.routers import grupos as groups_router

    owner = models.User(
        id="71000000-0000-0000-0000-000000000001",
        email="coverage-group-owner@sena.edu.co",
        password_hash="hash",
        nombre="Dueño del grupo",
        rol="investigador",
    )
    database_session.add(owner)
    group = models.Grupo(
        id="71000000-0000-0000-0000-000000000002",
        nombre="Grupo de cobertura",
        owner_id=owner.id,
    )
    database_session.add(group)
    database_session.commit()
    monkeypatch.setattr(
        "app.config.get_settings",
        lambda: SimpleNamespace(STORAGE_DIR=str(tmp_path)),
    )

    assert groups_router.list_grupo_proyectos(str(group.id), current_user=owner, db=database_session) == []

    async def upload_plan():
        upload = UploadFile(file=__import__("io").BytesIO(b"plan operativo"), filename="plan.pdf")
        return await groups_router.upload_plan_operativo(
            str(group.id), file=upload, current_user=owner, db=database_session
        )

    result = asyncio.run(upload_plan())
    assert result["message"] == "Plan operativo subido exitosamente"
    assert Path(tmp_path, "documentos", group.plan_operativo_path).read_bytes() == b"plan operativo"
    downloaded = groups_router.download_plan_operativo(
        str(group.id), current_user=owner, db=database_session
    )
    assert Path(downloaded.path).read_bytes() == b"plan operativo"


def test_apprentice_link_can_be_updated_and_removed_by_staff(database_session):
    from app.routers import semilleros as seedbeds_router

    instructor = models.User(
        id="72000000-0000-0000-0000-000000000001",
        email="coverage-seedbed-owner@sena.edu.co",
        password_hash="hash",
        nombre="Instructor responsable",
        rol="investigador",
    )
    learner = models.User(
        id="72000000-0000-0000-0000-000000000002",
        email="coverage-seedbed-learner@sena.edu.co",
        password_hash="hash",
        nombre="Aprendiz vinculado",
        rol="aprendiz",
        ficha="12345",
    )
    database_session.add_all([instructor, learner])
    group = models.Grupo(
        id="72000000-0000-0000-0000-000000000003",
        nombre="Grupo responsable",
        owner_id=instructor.id,
    )
    database_session.add(group)
    seedbed = models.Semillero(
        id="72000000-0000-0000-0000-000000000004",
        nombre="Semillero responsable",
        grupo_id=group.id,
        owner_id=instructor.id,
    )
    database_session.add(seedbed)
    link = models.Aprendiz(
        id="72000000-0000-0000-0000-000000000005",
        semillero_id=seedbed.id,
        user_id=learner.id,
        estado="activo",
    )
    database_session.add(link)
    database_session.commit()

    updated = seedbeds_router.update_aprendiz(
        str(seedbed.id),
        str(link.id),
        AprendizUpdate(estado="egresado"),
        current_user=instructor,
        db=database_session,
    )
    assert updated["estado"] == "egresado"
    removed = seedbeds_router.delete_aprendiz(
        str(seedbed.id), str(link.id), current_user=instructor, db=database_session
    )
    assert removed["message"] == "Vinculación de aprendiz eliminada"
    assert database_session.query(models.Aprendiz).filter_by(id=link.id).first() is None


def test_database_backup_reports_missing_sqlite_file_and_postgres_metadata(monkeypatch):
    from fastapi import HTTPException
    from app.routers import maintenance as maintenance_router

    admin = models.User(
        id="73000000-0000-0000-0000-000000000001",
        email="backup-admin@sena.edu.co",
        password_hash="hash",
        nombre="Administradora",
        rol="admin",
    )
    monkeypatch.setattr(maintenance_router.settings, "DATABASE_URL", "sqlite:///missing.db")
    monkeypatch.setattr(maintenance_router.os.path, "exists", lambda _path: False)
    with pytest.raises(HTTPException) as missing_backup:
        maintenance_router.create_backup(admin=admin)
    assert missing_backup.value.status_code == 404

    monkeypatch.setattr(
        maintenance_router.settings,
        "DATABASE_URL",
        "postgresql://db.example/sennova",
    )
    result = maintenance_router.create_backup(admin=admin)
    assert "pg_dump externo" in result["message"]
    assert result["url"] == "postgresql://db.example/sennova"


def test_investigator_certificate_is_a_valid_pdf_for_its_owner(database_session):
    from app.routers import reportes as reports_router

    investigator = models.User(
        id="74000000-0000-0000-0000-000000000001",
        email="certificado@sena.edu.co",
        password_hash="hash",
        nombre="Investigadora de prueba",
        rol="investigador",
    )
    database_session.add(investigator)
    database_session.commit()

    response = reports_router.generar_certificado_investigador(
        str(investigator.id), current_user=investigator, db=database_session
    )

    async def read_response():
        return b"".join([chunk async for chunk in response.body_iterator])

    pdf = asyncio.run(read_response())
    assert response.media_type == "application/pdf"
    assert pdf.startswith(b"%PDF-")
