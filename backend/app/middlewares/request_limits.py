"""Límites de cuerpo para cargas de formulaciones antes del parseo multipart."""

import json

from app.services.proyecto_import_service import (
    MAX_DOCX_EXPANDED_SIZE,
    MAX_FORMULATION_FILE_SIZE,
)


FORMULATION_PREVIEW_REQUEST_LIMIT = MAX_FORMULATION_FILE_SIZE + 256 * 1024
FORMULATION_IMPORT_REQUEST_LIMIT = (
    MAX_FORMULATION_FILE_SIZE + 2 * MAX_DOCX_EXPANDED_SIZE + 256 * 1024
)
FORMULATION_REQUEST_LIMITS = {
    "/proyectos/analizar-formulacion": FORMULATION_PREVIEW_REQUEST_LIMIT,
    "/proyectos/importar-formulacion": FORMULATION_IMPORT_REQUEST_LIMIT,
    "/expediente/analizar-archivos": 201 * 1024 * 1024,
    "/expediente/importar-archivos": 201 * 1024 * 1024,
}


class _RequestBodyTooLarge(Exception):
    """Interrumpe la lectura cuando el cuerpo supera el límite de la ruta."""


class FormulationRequestSizeLimitMiddleware:
    """Limita solicitudes de carga por cabecera y mientras llegan los fragmentos."""

    def __init__(self, app, request_limits=None):
        self.app = app
        self.request_limits = request_limits or FORMULATION_REQUEST_LIMITS

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http" or scope.get("method") != "POST":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "").rstrip("/")
        request_limit = next(
            (limit for suffix, limit in self.request_limits.items() if path.endswith(suffix)),
            None,
        )
        if request_limit is None:
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        try:
            content_length = int(headers.get(b"content-length", b"0"))
        except ValueError:
            content_length = 0
        if content_length > request_limit:
            await self._send_too_large(send)
            return

        received_bytes = 0
        response_started = False

        async def limited_receive():
            nonlocal received_bytes
            message = await receive()
            if message.get("type") == "http.request":
                received_bytes += len(message.get("body", b""))
                if received_bytes > request_limit:
                    raise _RequestBodyTooLarge
            return message

        async def tracked_send(message):
            nonlocal response_started
            if message.get("type") == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, limited_receive, tracked_send)
        except _RequestBodyTooLarge:
            if not response_started:
                await self._send_too_large(send)

    @staticmethod
    async def _send_too_large(send):
        body = json.dumps(
            {"detail": "El tamaño total de la solicitud supera el límite permitido."},
            ensure_ascii=False,
        ).encode("utf-8")
        await send({
            "type": "http.response.start",
            "status": 413,
            "headers": [
                (b"content-type", b"application/json; charset=utf-8"),
                (b"content-length", str(len(body)).encode("ascii")),
            ],
        })
        await send({"type": "http.response.body", "body": body, "more_body": False})
