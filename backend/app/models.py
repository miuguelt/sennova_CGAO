import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Date, 
    ForeignKey, Text, Float, Table, JSON
)
from sqlalchemy.orm import relationship

from app.database import Base, engine

# Detectar tipo de base de datos de forma más robusta
database_url = str(engine.url).lower()
is_sqlite = "sqlite" in database_url

# Importar tipos según la base de datos
if is_sqlite:
    # SQLite: usar String para UUID y JSON para arrays
    from sqlalchemy import String as UUIDType
    from sqlalchemy import JSON
    ARRAY = lambda x: JSON  # En SQLite, usamos JSON en lugar de ARRAY
else:
    # PostgreSQL: tipos nativos
    from sqlalchemy.dialects.postgresql import UUID as UUIDType, ARRAY


def generate_uuid():
    """Genera un UUID como string para compatibilidad con SQLite."""
    return str(uuid.uuid4())


def get_uuid_column(*args, **kwargs):
    """Crea una columna UUID compatible con SQLite y PostgreSQL."""
    # Si hay un default=uuid.uuid4, reemplazarlo por generate_uuid si es SQLite
    if is_sqlite and kwargs.get('default') == uuid.uuid4:
        kwargs['default'] = generate_uuid
    
    if is_sqlite:
        # SQLite: UUID como String(36)
        return Column(String(36), *args, **kwargs)
    else:
        # PostgreSQL: UUID nativo
        return Column(UUIDType(as_uuid=True), *args, **kwargs)


def get_array_column(item_type, *args, **kwargs):
    """Crea una columna ARRAY compatible con SQLite y PostgreSQL."""
    if is_sqlite:
        # SQLite: usar JSON para almacenar arrays
        return Column(JSON, *args, **kwargs)
    else:
        # PostgreSQL: ARRAY nativo
        return Column(ARRAY(item_type), *args, **kwargs)


# Tablas de relación many-to-many - UUID como String(36) para SQLite
_uuid_type = String(36) if is_sqlite else UUIDType(as_uuid=True)

grupo_integrantes = Table(
    'grupo_integrantes',
    Base.metadata,
    Column('grupo_id', _uuid_type, ForeignKey('grupos.id', ondelete='CASCADE'), primary_key=True),
    Column('user_id', _uuid_type, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('rol_en_grupo', String(50), default='Miembro'),
    Column('fecha_vinculacion', Date, default=lambda: datetime.now(timezone.utc))
)

proyecto_equipo = Table(
    'proyecto_equipo',
    Base.metadata,
    Column('proyecto_id', _uuid_type, ForeignKey('proyectos.id', ondelete='CASCADE'), primary_key=True),
    Column('user_id', _uuid_type, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('rol_en_proyecto', String(50)),
    Column('horas_dedicadas', Integer)
)

semillero_investigadores = Table(
    'semillero_investigadores',
    Base.metadata,
    Column('semillero_id', _uuid_type, ForeignKey('semilleros.id', ondelete='CASCADE'), primary_key=True),
    Column('user_id', _uuid_type, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('rol_en_semillero', String(50), default='Coinvestigador'),
    Column('fecha_vinculacion', Date, default=lambda: datetime.now(timezone.utc))
)


class User(Base):
    __tablename__ = "users"
    
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    nombre = Column(String(255), nullable=False)
    rol = Column(String(50), nullable=False, default='investigador')  # admin, investigador
    
    # Perfil profesional
    rol_sennova = Column(String(100))
    nivel_academico = Column(String(100))
    horas_mensuales = Column(Integer)
    meses_vinculacion = Column(Integer)
    cv_lac_url = Column(Text)
    estado_cv_lac = Column(String(50), default='No actualizado')
    lineas_investigacion = get_array_column(String)
    sede = Column(String(100))
    regional = Column(String(100))
    
    # Campos específicos para aprendices (si aplica)
    documento = Column(String(20), unique=True, index=True)
    celular = Column(String(20))
    ficha = Column(String(50))
    programa_formacion = Column(String(255))
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    grupos_creados = relationship("Grupo", back_populates="owner", lazy="dynamic", foreign_keys="Grupo.owner_id")
    semilleros_creados = relationship("Semillero", back_populates="owner", lazy="dynamic", foreign_keys="Semillero.owner_id")
    proyectos_creados = relationship("Proyecto", back_populates="owner", lazy="dynamic", foreign_keys="Proyecto.owner_id")
    productos_creados = relationship("Producto", back_populates="owner", lazy="dynamic", foreign_keys="Producto.owner_id")
    
    grupos_miembro = relationship("Grupo", secondary=grupo_integrantes, back_populates="integrantes")
    semilleros_miembro = relationship("Semillero", secondary=semillero_investigadores, back_populates="investigadores")
    proyectos_miembro = relationship("Proyecto", secondary=proyecto_equipo, back_populates="equipo")
    
    # Nuevas relaciones para entregables y notificaciones
    entregables_asignados = relationship("Entregable", back_populates="responsable", lazy="dynamic", foreign_keys="Entregable.responsable_id")
    notificaciones = relationship("Notificacion", back_populates="user", lazy="dynamic", order_by="desc(Notificacion.created_at)")


class Grupo(Base):
    __tablename__ = "grupos"
    
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    nombre = Column(String(255), nullable=False)
    nombre_completo = Column(Text)
    codigo_gruplac = Column(String(50))
    clasificacion = Column(String(10))  # A1, A, B, C, D, Reconocido
    gruplac_url = Column(Text)
    lineas_investigacion = get_array_column(String)
    
    owner_id = get_uuid_column(ForeignKey("users.id"), nullable=False)
    is_publico = Column(Boolean, default=True)
    estado = Column(String(50), default='activo')  # activo, inactivo
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    owner = relationship("User", back_populates="grupos_creados", foreign_keys=[owner_id])
    integrantes = relationship("User", secondary=grupo_integrantes, back_populates="grupos_miembro")
    semilleros = relationship("Semillero", back_populates="grupo", cascade="all, delete-orphan")


class Semillero(Base):
    __tablename__ = "semilleros"
    
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    nombre = Column(String(255), nullable=False)
    linea_investigacion = Column(Text)
    plan_accion = Column(Text)
    horas_dedicadas = Column(Integer)
    estado = Column(String(50), default='activo')  # activo, inactivo
    
    grupo_id = get_uuid_column(ForeignKey("grupos.id"), nullable=False)
    owner_id = get_uuid_column(ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    grupo = relationship("Grupo", back_populates="semilleros")
    owner = relationship("User", back_populates="semilleros_creados", foreign_keys=[owner_id])
    investigadores = relationship("User", secondary=semillero_investigadores, back_populates="semilleros_miembro")
    aprendices = relationship("Aprendiz", back_populates="semillero", cascade="all, delete-orphan")
    proyectos = relationship("Proyecto", back_populates="semillero")


class Aprendiz(Base):
    __tablename__ = "aprendices"
    
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    
    # Datos de vinculación específicos del semillero
    estado = Column(String(50), default='activo') # activo, egresado, retirado
    fecha_ingreso = Column(Date, default=lambda: datetime.now(timezone.utc).date())
    fecha_egreso = Column(Date, nullable=True)
    
    # Columnas heredadas de migraciones previas (para compatibilidad)
    nombre = Column(String(255))
    ficha = Column(String(50))
    programa = Column(String(255))
    
    # Llaves foráneas
    semillero_id = get_uuid_column(ForeignKey("semilleros.id", ondelete="CASCADE"), nullable=False)
    user_id = get_uuid_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True) # Permitir nulo temporalmente para registros migrados

    # Relaciones
    semillero = relationship("Semillero", back_populates="aprendices")
    user = relationship("User", backref="perfil_aprendiz")

    @property
    def info_consolidada(self):
        """Mantiene compatibilidad con código que espera un objeto plano con info del usuario."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "nombre": self.user.nombre if self.user else self.nombre,
            "email": self.user.email if self.user else None,
            "documento": self.user.documento if self.user else None,
            "ficha": self.user.ficha if self.user else self.ficha,
            "programa": self.user.programa_formacion if self.user else self.programa,
            "celular": self.user.celular if self.user else None,
            "estado": self.estado,
            "fecha_ingreso": self.fecha_ingreso
        }



class Convocatoria(Base):
    __tablename__ = "convocatorias"
    
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    numero_oe = Column(String(50), nullable=False)  # Oferta de Empleo
    nombre = Column(Text, nullable=False)
    año = Column(Integer, nullable=False)
    fecha_apertura = Column(Date)
    fecha_cierre = Column(Date)
    estado = Column(String(50), default='abierta')  # abierta, cerrada, en_evaluacion, resultados_publicados
    descripcion = Column(Text)
    
    owner_id = get_uuid_column(ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    owner = relationship("User")
    proyectos = relationship("Proyecto", back_populates="convocatoria")


class Proyecto(Base):
    __tablename__ = "proyectos"
    
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    codigo_sgps = Column(String(50))
    nombre = Column(Text, nullable=False)
    nombre_corto = Column(String(255))
    
    estado = Column(String(50), default='Formulación')  # Formulación, Enviado, Aprobado, En ejecución, Finalizado, Rechazado
    vigencia = Column(Integer)  # meses
    presupuesto_total = Column(Float)
    
    tipologia = Column(String(100))  # Red, Impacto, Innovación, etc.
    linea_investigacion = Column(Text)
    red_conocimiento = Column(String(100))
    descripcion = Column(Text)
    objetivo_general = Column(Text)
    objetivos_especificos = get_array_column(String)
    
    # Finanzas Detalladas
    presupuesto_detallado = Column(JSON)  # { "materiales": 0, "viaticos": 0, "servicios": 0, ... }
    linea_programatica = Column(String(100))  # Ej: 65, 82, etc.
    
    # Vinculación con Retos y Semilleros
    reto_origen_id = get_uuid_column(ForeignKey("retos.id"))
    semillero_id = get_uuid_column(ForeignKey("semilleros.id"))
    
    convocatoria_id = get_uuid_column(ForeignKey("convocatorias.id"))
    owner_id = get_uuid_column(ForeignKey("users.id"), nullable=False)
    
    is_publico = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    convocatoria = relationship("Convocatoria", back_populates="proyectos")
    semillero = relationship("Semillero", back_populates="proyectos")
    owner = relationship("User", back_populates="proyectos_creados", foreign_keys=[owner_id])
    equipo = relationship("User", secondary=proyecto_equipo, back_populates="proyectos_miembro")
    productos = relationship("Producto", back_populates="proyecto")
    entregables = relationship("Entregable", back_populates="proyecto", lazy="dynamic", cascade="all, delete-orphan")
    bitacora = relationship("BitacoraEntry", back_populates="proyecto", cascade="all, delete-orphan")


class Producto(Base):
    __tablename__ = "productos"
    
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    tipo = Column(String(50), nullable=False)  # software, articulo, capitulo_libro, patente, ponencia, video, prototipo
    nombre = Column(Text, nullable=False)
    descripcion = Column(Text)
    fecha_publicacion = Column(Date)
    doi = Column(String(255))
    url = Column(Text)
    
    is_verificado = Column(Boolean, default=False)  # Solo admin puede verificar
    verificado_por = get_uuid_column(ForeignKey("users.id"))
    fecha_verificacion = Column(DateTime)
    
    proyecto_id = get_uuid_column(ForeignKey("proyectos.id"))
    owner_id = get_uuid_column(ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    proyecto = relationship("Proyecto", back_populates="productos")
    owner = relationship("User", back_populates="productos_creados", foreign_keys=[owner_id])
    entregables = relationship("Entregable", back_populates="producto", lazy="dynamic")


class Documento(Base):
    __tablename__ = "documentos"
    
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    entidad_tipo = Column(String(50), nullable=False)  # proyecto, producto, user
    entidad_id = get_uuid_column(nullable=False)
    tipo = Column(String(50), nullable=False)  # cvlac_pdf, acta, contrato, informe
    nombre_archivo = Column(String(255))
    content_type = Column(String(100))
    data_base64 = Column(Text)  # Obsoleto, migrando a file_path
    file_path = Column(String(255))  # Nueva columna para almacenamiento en disco
    
    owner_id = get_uuid_column(ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    owner = relationship("User")


class Entregable(Base):
    """Entregables de proyecto - Cronograma SENNOVA"""
    __tablename__ = "entregables"
    
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    
    # Información del entregable
    fase = Column(String(100), nullable=False)  # Fase I, II, III, Final
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text)
    tipo = Column(String(50), default='general')  # informe, producto, documento, evaluacion
    
    # Fechas importantes
    fecha_entrega = Column(Date, nullable=False)
    fecha_recordatorio_15d = Column(Date)  # Recordatorio 15 días antes
    fecha_recordatorio_3d = Column(Date)   # Recordatorio 3 días antes
    
    # Estado y seguimiento
    estado = Column(String(50), default='pendiente')  # pendiente, en_desarrollo, enviado, aprobado, ajustes_requeridos
    fecha_envio = Column(Date)
    fecha_aprobacion = Column(Date)
    observaciones = Column(Text)
    
    # Vinculación
    proyecto_id = get_uuid_column(ForeignKey("proyectos.id", ondelete="CASCADE"), nullable=False)
    responsable_id = get_uuid_column(ForeignKey("users.id"))
    
    # Producto vinculado (opcional)
    producto_id = get_uuid_column(ForeignKey("productos.id"))
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    proyecto = relationship("Proyecto", back_populates="entregables")
    responsable = relationship("User", back_populates="entregables_asignados")
    producto = relationship("Producto", back_populates="entregables")


class Notificacion(Base):
    """Sistema de notificaciones in-app y email"""
    __tablename__ = "notificaciones"
    
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    
    # Destinatario
    user_id = get_uuid_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Contenido
    tipo = Column(String(50), nullable=False)  # entregable, convocatoria, producto, sistema
    titulo = Column(String(255), nullable=False)
    mensaje = Column(Text, nullable=False)
    
    # Enlace opcional (para navegar al recurso)
    entidad_tipo = Column(String(50))  # proyecto, entregable, convocatoria, producto
    entidad_id = get_uuid_column()
    
    # Estado
    leida = Column(Boolean, default=False)
    fecha_lectura = Column(DateTime)
    
    # Email
    email_enviado = Column(Boolean, default=False)
    fecha_envio_email = Column(DateTime)
    
    # Prioridad
    prioridad = Column(String(20), default='normal')  # baja, normal, alta, urgente
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    user = relationship("User", back_populates="notificaciones")


class Actividad(Base):
    """Registro de historial e interacciones en el sistema"""
    __tablename__ = "actividades"
    
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    
    user_id = get_uuid_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tipo_accion = Column(String(100), nullable=False)  # login, create_project, upload_file, update_profile, etc.
    descripcion = Column(Text, nullable=False)
    
    # Metadatos del recurso afectado
    entidad_tipo = Column(String(50))  # proyecto, producto, usuario, documento
    entidad_id = get_uuid_column()
    
    # Contexto técnico
    ip_address = Column(String(50))
    user_agent = Column(Text)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    user = relationship("User")


class Reto(Base):
    """Banco de problemas/necesidades de la región o sector productivo"""
    __tablename__ = "retos"
    
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=False)
    sector_productivo = Column(String(100))
    empresa_solicitante = Column(String(255))
    contacto_email = Column(String(255))
    
    estado = Column(String(50), default='abierto')  # abierta, en_estudio, asignado, resuelto
    prioridad = Column(String(20), default='media')
    
    # Puede asignarse a un semillero o grupo para que lo resuelva
    semillero_asignado_id = get_uuid_column(ForeignKey("semilleros.id"))
    
    owner_id = get_uuid_column(ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    owner = relationship("User")
    semillero_asignado = relationship("Semillero")
    proyectos_vinculados = relationship("Proyecto", backref="reto_origen")



class BitacoraEntry(Base):
    """Entradas de bitácora técnica de proyectos"""
    __tablename__ = "bitacora_entries"
    
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    proyecto_id = get_uuid_column(ForeignKey("proyectos.id", ondelete="CASCADE"), nullable=False)
    user_id = get_uuid_column(ForeignKey("users.id"), nullable=False) # Creador de la entrada
    
    fecha = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    titulo = Column(String(255), nullable=False)
    contenido = Column(Text, nullable=False)
    categoria = Column(String(50)) # técnica, administrativa, observación, resultado
    adjuntos = Column(JSON, nullable=True) # Lista de URLs o metadatos de archivos
    
    # Sistema de Firma Digital Dual
    is_firmado_investigador = Column(Boolean, default=False)
    fecha_firma_investigador = Column(DateTime)
    
    is_firmado_aprendiz = Column(Boolean, default=False)
    fecha_firma_aprendiz = Column(DateTime)
    
    # Evidencia técnica de la firma (Hash, IP, UserAgent)
    signature_metadata = Column(JSON, nullable=True) 
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    proyecto = relationship("Proyecto", back_populates="bitacora")
    user = relationship("User")



class AuditLog(Base):
    """Registro estricto de auditoría para cambios de datos (POST/PUT/DELETE)"""
    __tablename__ = "audit_logs"
    
    id = get_uuid_column(primary_key=True, default=uuid.uuid4)
    user_id = get_uuid_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    method = Column(String(10), nullable=False)
    endpoint = Column(String(255), nullable=False)
    status_code = Column(Integer, nullable=False)
    ip_address = Column(String(50))
    user_agent = Column(Text)
    payload_snapshot = Column(JSON, nullable=True) # Solo en DBs que soporten JSON
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User")
