"""Política compartida de acceso a proyectos."""

from app.auth import STAFF_ROLES


def can_access_project(project, user) -> bool:
    """Aplica la misma regla de acceso del proyecto a sus datos y soportes."""
    if user.rol in STAFF_ROLES:
        return True
    if str(project.owner_id) == str(user.id):
        return True
    if any(str(member.id) == str(user.id) for member in project.equipo):
        return True
    if user.rol == "aprendiz" and project.semillero:
        return any(
            str(apprentice.user_id) == str(user.id)
            for apprentice in project.semillero.aprendices
        )
    return False
