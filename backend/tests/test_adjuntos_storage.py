"""Almacén de adjuntos: reparto acotado en disco y política de tipos.

El diseño responde a dos exigencias: el árbol de carpetas no puede crecer sin
límite (una carpeta por conversación o por día degenera con el uso), y el
contenido subido no puede confiar en la extensión ni en el content-type que
declara el cliente.
"""

import io
import os

import pytest

from db_support import db_path_for, sqlite_url_for

os.environ.setdefault("DATABASE_URL", sqlite_url_for(db_path_for("test_adjuntos.db")))
os.environ.setdefault(
    "JWT_SECRET", "testsecretkey_long_enough_for_security_compliance_32_chars"
)

from app.services import attachment_policy as policy  # noqa: E402
from app.services import attachment_storage as storage  # noqa: E402

PNG = bytes.fromhex("89504e470d0a1a0a") + b"\x00" * 64
JPEG = bytes.fromhex("ffd8ffe0") + b"\x00" * 64
PDF = b"%PDF-1.7\n" + b"\x00" * 64
MP4 = b"\x00\x00\x00\x20ftypisom" + b"\x00" * 64
MP3 = b"ID3\x04\x00" + b"\x00" * 64
DOCX = b"PK\x03\x04" + b"\x00" * 64
EXE = b"MZ\x90\x00" + b"\x00" * 64


@pytest.fixture
def raiz(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "RAIZ_ADJUNTOS", tmp_path / "adjuntos")
    return tmp_path / "adjuntos"


def _guardar(datos: bytes, nombre: str):
    return storage.guardar_archivo(io.BytesIO(datos), nombre)


class TestReparto:
    def test_reparte_en_dos_niveles_de_dos_digitos(self, raiz):
        guardado = _guardar(PNG, "foto.png")

        partes = guardado.ruta_relativa.split("/")
        assert len(partes) == 3, "se esperan dos niveles de carpeta más el archivo"
        assert len(partes[0]) == 2 and len(partes[1]) == 2
        assert partes[0] == guardado.sha256[:2]
        assert partes[1] == guardado.sha256[2:4]
        assert partes[2].startswith(guardado.sha256)
        assert partes[2].endswith(".png")

    def test_la_profundidad_no_crece_con_el_numero_de_archivos(self, raiz):
        for i in range(60):
            _guardar(PNG[:8] + f"contenido-{i}".encode() + b"\x00" * 32, f"f{i}.png")

        profundidades = {
            os.path.relpath(directorio, raiz).count(os.sep)
            for directorio, _, archivos in os.walk(raiz)
            if archivos
        }
        assert profundidades == {1}, f"profundidad inesperada: {profundidades}"

    def test_el_mismo_contenido_no_se_duplica_en_disco(self, raiz):
        primero = _guardar(PDF, "informe.pdf")
        segundo = _guardar(PDF, "copia-del-informe.pdf")

        assert primero.sha256 == segundo.sha256
        assert primero.ruta_relativa == segundo.ruta_relativa
        assert segundo.ya_existia is True
        archivos = [f for _, _, fs in os.walk(raiz) for f in fs]
        assert len(archivos) == 1

    def test_contenidos_distintos_no_colisionan(self, raiz):
        uno = _guardar(PNG, "a.png")
        otro = _guardar(JPEG, "b.jpg")

        assert uno.ruta_relativa != otro.ruta_relativa
        assert len([f for _, _, fs in os.walk(raiz) for f in fs]) == 2


class TestSeguridadDeRutas:
    def test_resolver_rechaza_salir_del_arbol(self, raiz):
        with pytest.raises(ValueError):
            storage.resolver_ruta("../../etc/passwd")

    def test_resolver_devuelve_ruta_dentro_de_la_raiz(self, raiz):
        guardado = _guardar(PNG, "foto.png")
        ruta = storage.resolver_ruta(guardado.ruta_relativa)

        assert ruta.exists()
        assert raiz.resolve() in ruta.resolve().parents

    def test_eliminar_solo_borra_cuando_nadie_referencia(self, raiz):
        guardado = _guardar(PNG, "foto.png")

        storage.eliminar_si_no_referenciado(guardado.ruta_relativa, sigue_referenciado=True)
        assert storage.resolver_ruta(guardado.ruta_relativa).exists()

        storage.eliminar_si_no_referenciado(guardado.ruta_relativa, sigue_referenciado=False)
        assert not storage.resolver_ruta(guardado.ruta_relativa).exists()


class TestPolitica:
    @pytest.mark.parametrize(
        "datos, nombre, categoria",
        [
            (PNG, "captura.png", "imagen"),
            (JPEG, "foto.jpg", "imagen"),
            (PDF, "acta.pdf", "documento"),
            (DOCX, "informe.docx", "documento"),
            (MP4, "demo.mp4", "video"),
            (MP3, "nota.mp3", "audio"),
        ],
    )
    def test_acepta_los_formatos_comunes(self, datos, nombre, categoria):
        resultado = policy.clasificar(datos, nombre)
        assert resultado.categoria == categoria

    def test_rechaza_ejecutables(self):
        with pytest.raises(policy.TipoNoPermitido):
            policy.clasificar(EXE, "instalador.exe")

    def test_rechaza_contenido_que_no_coincide_con_la_extension(self):
        # Un ejecutable renombrado a .png no puede pasar el filtro
        with pytest.raises(policy.TipoNoPermitido):
            policy.clasificar(EXE, "inofensivo.png")

    def test_cada_categoria_declara_su_limite_de_tamano(self):
        for categoria in ("imagen", "documento", "audio", "video"):
            assert policy.limite_bytes(categoria) > 0
        assert policy.limite_bytes("video") > policy.limite_bytes("imagen")

    def test_el_nombre_original_se_sanea(self):
        resultado = policy.clasificar(PNG, "../../etc/foto rara.png")
        assert "/" not in resultado.nombre_seguro
        assert ".." not in resultado.nombre_seguro
        assert resultado.nombre_seguro.endswith(".png")
