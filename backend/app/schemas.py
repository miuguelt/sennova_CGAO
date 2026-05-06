from datetime import datetime, date
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ==========================================
# BASE SCHEMAS
# ==========================================

class BaseSchema(BaseModel):
    class Config:
        from_attributes = True


# ==========================================
# USER SCHEMAS
# ==========================================

class UserBase(BaseModel):
    email: EmailStr
    nombre: str
    rol: str = "investigador"
    sede: Optional[str] = None
    regional: Optional[str] = None
    is_active: bool = True
    rol_sennova: Optional[str] = None
    nivel_academico: Optional[str] = None
    cv_lac_url: Optional[str] = None
    documento: Optional[str] = None
    celular: Optional[str] = None
    ficha: Optional[str] = None
    programa_formacion: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    rol_sennova: Optional[str] = None
    nivel_academico: Optional[str] = None
    horas_mensuales: Optional[int] = None
    meses_vinculacion: Optional[int] = None
    cv_lac_url: Optional[str] = None
    estado_cv_lac: Optional[str] = None
    lineas_investigacion: Optional[List[str]] = None
    sede: Optional[str] = None
    regional: Optional[str] = None
    is_active: Optional[bool] = None
    documento: Optional[str] = None
    celular: Optional[str] = None
    ficha: Optional[str] = None
    programa_formacion: Optional[str] = None


class UserResponse(UserBase):
    id: UUID
    rol_sennova: Optional[str] = None
    nivel_academico: Optional[str] = None
    horas_mensuales: Optional[int] = None
    meses_vinculacion: Optional[int] = None
    cv_lac_url: Optional[str] = None
    estado_cv_lac: Optional[str] = None
    lineas_investigacion: Optional[List[str]] = None
    regional: Optional[str] = None
    created_at: Optional[datetime] = None  # Leniente para evitar fallos con datos nulos

    class Config:
        from_attributes = True


# ==========================================
# AUTH SCHEMAS
# ==========================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ==========================================
# GRUPO SCHEMAS
# ==========================================

class GrupoBase(BaseModel):
    nombre: str
    nombre_completo: Optional[str] = None
    codigo_gruplac: Optional[str] = None
    clasificacion: Optional[str] = None  # A1, A, B, C, D, Reconocido
    gruplac_url: Optional[str] = None
    lineas_investigacion: Optional[List[str]] = None
    is_publico: bool = True
    estado: str = "activo"


class GrupoCreate(GrupoBase):
    pass


class GrupoUpdate(BaseModel):
    nombre: Optional[str] = None
    nombre_completo: Optional[str] = None
    codigo_gruplac: Optional[str] = None
    clasificacion: Optional[str] = None
    gruplac_url: Optional[str] = None
    lineas_investigacion: Optional[List[str]] = None
    is_publico: Optional[bool] = None
    estado: Optional[str] = None


class IntegranteInfo(BaseModel):
    id: str
    nombre: str
    email: str
    rol_en_grupo: Optional[str] = None
    fecha_vinculacion: Optional[date] = None

    class Config:
        from_attributes = True


class GrupoResponse(GrupoBase):
    id: str
    owner_id: str
    owner: Optional[UserResponse] = None
    integrantes: List[dict] = []  # Simplificado para evitar errores de serialización
    total_integrantes: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# SEMILLERO SCHEMAS
# ==========================================

class AprendizBase(BaseModel):
    user_id: UUID
    estado: str = "activo"
    fecha_ingreso: Optional[date] = None
    fecha_egreso: Optional[date] = None


class AprendizCreate(BaseModel):
    user_id: UUID
    semillero_id: Optional[UUID] = None
    estado: str = "activo"
    fecha_ingreso: Optional[date] = None


class AprendizFullCreate(BaseModel):
    """Schema for creating both a User and an Aprendiz record in one go."""
    email: EmailStr
    nombre: str
    password: str = Field(..., min_length=6)
    documento: Optional[str] = None
    celular: Optional[str] = None
    ficha: Optional[str] = None
    programa_formacion: Optional[str] = None
    semillero_id: UUID
    estado: str = "activo"


class AprendizUpdate(BaseModel):
    estado: Optional[str] = None
    fecha_egreso: Optional[date] = None


class AprendizResponse(BaseModel):
    id: UUID
    semillero_id: UUID
    user_id: UUID
    user: Optional[UserResponse] = None
    estado: str
    fecha_ingreso: date
    fecha_egreso: Optional[date] = None

    class Config:
        from_attributes = True


class SemilleroBase(BaseModel):
    nombre: str
    linea_investigacion: Optional[str] = None
    plan_accion: Optional[str] = None
    horas_dedicadas: Optional[int] = None
    estado: str = "activo"


class SemilleroCreate(SemilleroBase):
    grupo_id: UUID


class SemilleroUpdate(BaseModel):
    nombre: Optional[str] = None
    linea_investigacion: Optional[str] = None
    plan_accion: Optional[str] = None
    horas_dedicadas: Optional[int] = None
    estado: Optional[str] = None


class SemilleroInvestigadorCreate(BaseModel):
    user_id: UUID
    rol_en_semillero: str = "Coinvestigador"


class SemilleroResponse(SemilleroBase):
    id: UUID
    grupo_id: UUID
    grupo: Optional[GrupoResponse] = None
    owner_id: UUID
    investigadores: List[dict] = []
    aprendices: List[AprendizResponse] = []
    total_aprendices: int = 0
    total_investigadores: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# CONVOCATORIA SCHEMAS
# ==========================================

class ConvocatoriaBase(BaseModel):
    numero_oe: str
    nombre: str
    año: int
    fecha_apertura: Optional[date] = None
    fecha_cierre: Optional[date] = None
    estado: str = "abierta"  # abierta, cerrada, en_evaluacion, resultados_publicados
    descripcion: Optional[str] = None


class ConvocatoriaCreate(ConvocatoriaBase):
    pass


class ConvocatoriaUpdate(BaseModel):
    numero_oe: Optional[str] = None
    nombre: Optional[str] = None
    año: Optional[int] = None
    fecha_apertura: Optional[date] = None
    fecha_cierre: Optional[date] = None
    estado: Optional[str] = None
    descripcion: Optional[str] = None


class ConvocatoriaResponse(ConvocatoriaBase):
    id: UUID
    owner_id: UUID
    total_proyectos: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# PROYECTO SCHEMAS
# ==========================================

class EquipoMiembro(BaseModel):
    user_id: UUID
    rol_en_proyecto: Optional[str] = None
    horas_dedicadas: Optional[int] = None


class ProyectoBase(BaseModel):
    codigo_sgps: Optional[str] = None
    nombre: str
    nombre_corto: Optional[str] = None
    estado: str = "Formulación"  # Formulación, Enviado, Aprobado, En ejecución, Finalizado, Rechazado
    vigencia: Optional[int] = None
    presupuesto_total: Optional[float] = None
    tipologia: Optional[str] = None
    linea_investigacion: Optional[str] = None
    red_conocimiento: Optional[str] = None
    descripcion: Optional[str] = None
    objetivo_general: Optional[str] = None
    objetivos_especificos: Optional[List[str]] = None
    is_publico: bool = False
    presupuesto_detallado: Optional[dict] = None
    linea_programatica: Optional[str] = None
    reto_origen_id: Optional[UUID] = None
    semillero_id: Optional[UUID] = None


class ProyectoCreate(ProyectoBase):
    convocatoria_id: Optional[UUID] = None
    equipo: Optional[List[EquipoMiembro]] = []


class ProyectoUpdate(BaseModel):
    codigo_sgps: Optional[str] = None
    nombre: Optional[str] = None
    nombre_corto: Optional[str] = None
    estado: Optional[str] = None
    vigencia: Optional[int] = None
    presupuesto_total: Optional[float] = None
    tipologia: Optional[str] = None
    linea_investigacion: Optional[str] = None
    red_conocimiento: Optional[str] = None
    descripcion: Optional[str] = None
    objetivo_general: Optional[str] = None
    objetivos_especificos: Optional[List[str]] = None
    is_publico: Optional[bool] = None
    convocatoria_id: Optional[UUID] = None
    presupuesto_detallado: Optional[dict] = None
    linea_programatica: Optional[str] = None
    reto_origen_id: Optional[UUID] = None
    semillero_id: Optional[UUID] = None


class EquipoMiembroInfo(BaseModel):
    id: UUID
    nombre: str
    email: str
    rol_en_proyecto: Optional[str]
    horas_dedicadas: Optional[int]


class ProyectoResponse(ProyectoBase):
    id: UUID
    owner_id: UUID
    owner: Optional[UserResponse] = None
    convocatoria_id: Optional[UUID] = None
    convocatoria: Optional[ConvocatoriaResponse] = None
    semillero: Optional['SemilleroBase'] = None
    equipo: List[EquipoMiembroInfo] = []
    total_equipo: int = 0
    total_productos: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# PRODUCTO SCHEMAS
# ==========================================

class ProductoBase(BaseModel):
    tipo: str  # software, articulo, capitulo_libro, patente, ponencia, video, prototipo
    nombre: str
    descripcion: Optional[str] = None
    fecha_publicacion: Optional[date] = None
    doi: Optional[str] = None
    url: Optional[str] = None


class ProductoCreate(ProductoBase):
    proyecto_id: Optional[UUID] = None


class ProductoUpdate(BaseModel):
    tipo: Optional[str] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    fecha_publicacion: Optional[date] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    proyecto_id: Optional[UUID] = None


class ProductoVerificar(BaseModel):
    is_verificado: bool


class ProductoResponse(ProductoBase):
    id: UUID
    is_verificado: bool
    verificado_por: Optional[UUID] = None
    fecha_verificacion: Optional[datetime] = None
    proyecto_id: Optional[UUID] = None
    proyecto_nombre: Optional[str] = None
    owner_id: UUID
    owner_nombre: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# DOCUMENTO SCHEMAS
# ==========================================

class DocumentoBase(BaseModel):
    entidad_tipo: str  # proyecto, producto, user
    entidad_id: UUID
    tipo: str  # cvlac_pdf, acta, contrato, informe
    nombre_archivo: str


class DocumentoCreate(DocumentoBase):
    data_base64: str


class DocumentoResponse(DocumentoBase):
    id: UUID
    content_type: Optional[str] = None
    owner_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# DASHBOARD SCHEMAS
# ==========================================

class DashboardStats(BaseModel):
    total_usuarios: int
    total_proyectos: int
    total_grupos: int
    total_semillero: int
    total_convocatorias: int
    total_productos: int
    productos_verificados: int
    productos_pendientes: int
    proyectos_por_estado: dict
    productos_por_tipo: dict


# ==========================================
# ENTREGABLE SCHEMAS (Cronograma SENNOVA)
# ==========================================

class EntregableBase(BaseModel):
    fase: str  # Fase I, II, III, Final
    titulo: str
    descripcion: Optional[str] = None
    tipo: str = "general"  # informe, producto, documento, evaluacion
    fecha_entrega: date


class EntregableCreate(EntregableBase):
    proyecto_id: UUID
    responsable_id: Optional[UUID] = None
    producto_id: Optional[UUID] = None


class EntregableUpdate(BaseModel):
    fase: Optional[str] = None
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    tipo: Optional[str] = None
    fecha_entrega: Optional[date] = None
    estado: Optional[str] = None  # pendiente, en_desarrollo, enviado, aprobado, ajustes_requeridos
    fecha_envio: Optional[date] = None
    fecha_aprobacion: Optional[date] = None
    observaciones: Optional[str] = None
    responsable_id: Optional[UUID] = None
    producto_id: Optional[UUID] = None


class EntregableResponse(EntregableBase):
    id: UUID
    estado: str
    fecha_envio: Optional[date] = None
    fecha_aprobacion: Optional[date] = None
    observaciones: Optional[str] = None
    proyecto_id: UUID
    responsable_id: Optional[UUID] = None
    producto_id: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Campos expandidos
    responsable_nombre: Optional[str] = None
    producto_nombre: Optional[str] = None
    dias_restantes: Optional[int] = None
    
    class Config:
        from_attributes = True


class EntregableListResponse(BaseModel):
    id: UUID
    fase: str
    titulo: str
    estado: str
    fecha_entrega: date
    dias_restantes: Optional[int] = None
    
    class Config:
        from_attributes = True


# ==========================================
# NOTIFICACION SCHEMAS
# ==========================================

class NotificacionBase(BaseModel):
    tipo: str  # entregable, convocatoria, producto, sistema
    titulo: str
    mensaje: str
    prioridad: str = "normal"  # baja, normal, alta, urgente


class NotificacionCreate(NotificacionBase):
    user_id: UUID
    entidad_tipo: Optional[str] = None  # proyecto, entregable, convocatoria, producto
    entidad_id: Optional[UUID] = None


class NotificacionResponse(NotificacionBase):
    id: UUID
    user_id: UUID
    entidad_tipo: Optional[str] = None
    entidad_id: Optional[UUID] = None
    leida: bool
    fecha_lectura: Optional[datetime] = None
    email_enviado: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class NotificacionListResponse(BaseModel):
    id: UUID
    tipo: str
    titulo: str
    leida: bool
    prioridad: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class NotificacionMarcarLeida(BaseModel):
    leida: bool = True


class NotificacionStats(BaseModel):
    total: int
    no_leidas: int
    por_tipo: dict
    por_prioridad: dict


# ==========================================
# ACTIVIDAD SCHEMAS (Historial)
# ==========================================

class ActividadBase(BaseModel):
    tipo_accion: str  # login, create_project, upload_file, update_profile, etc.
    descripcion: str
    entidad_tipo: Optional[str] = None
    entidad_id: Optional[UUID] = None


class ActividadCreate(ActividadBase):
    user_id: UUID
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class ActividadResponse(ActividadBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    user_nombre: Optional[str] = None
    method: str
    endpoint: str
    status_code: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# BITACORA SCHEMAS
# ==========================================

class BitacoraBase(BaseModel):
    titulo: str
    contenido: str
    categoria: str = "técnica" # técnica, administrativa, observación, resultado
    fecha: Optional[datetime] = None
    adjuntos: Optional[List[dict]] = None # Soporta lista de metadatos de archivos

class BitacoraCreate(BitacoraBase):
    proyecto_id: UUID

class BitacoraUpdate(BaseModel):
    titulo: Optional[str] = None
    contenido: Optional[str] = None
    categoria: Optional[str] = None
    fecha: Optional[datetime] = None
    adjuntos: Optional[List[dict]] = None

class BitacoraSignRequest(BaseModel):
    pin: Optional[str] = None # Para futura validación extra si se desea
    evidence: Optional[dict] = None

class BitacoraResponse(BitacoraBase):
    id: UUID
    proyecto_id: UUID
    user_id: UUID
    user_nombre: Optional[str] = None
    
    is_firmado_investigador: bool = False
    fecha_firma_investigador: Optional[datetime] = None
    
    is_firmado_aprendiz: bool = False
    fecha_firma_aprendiz: Optional[datetime] = None
    
    signature_metadata: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True
