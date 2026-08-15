"""Product route composition root."""

from fastapi import APIRouter

from app.routers import (
    productos_commands,
    productos_query,
    productos_stats,
    productos_verification,
)

router = APIRouter(tags=["Productos de Investigación"])

# Keep route groups isolated while exposing the original public prefix.
# Static subpaths must precede /{producto_id} so they are never shadowed.
router.include_router(productos_stats.router)
router.include_router(productos_query.router)
router.include_router(productos_commands.router)
router.include_router(productos_verification.router)
