import asyncio

from app.middlewares.request_limits import FormulationRequestSizeLimitMiddleware


def test_formulation_request_limit_rejects_content_length_before_calling_app():
    app_called = False
    messages = []

    async def app(_scope, _receive, _send):
        nonlocal app_called
        app_called = True

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        messages.append(message)

    middleware = FormulationRequestSizeLimitMiddleware(
        app,
        request_limits={"/proyectos/analizar-formulacion": 8},
    )
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/proyectos/analizar-formulacion",
        "headers": [(b"content-length", b"9")],
    }

    asyncio.run(middleware(scope, receive, send))

    assert app_called is False
    assert messages[0]["type"] == "http.response.start"
    assert messages[0]["status"] == 413
    assert "límite" in messages[1]["body"].decode().lower()


def test_formulation_request_limit_stops_chunked_body_after_limit():
    messages = []
    app_called = False

    async def app(_scope, receive, send):
        nonlocal app_called
        app_called = True
        while True:
            message = await receive()
            if not message.get("more_body", False):
                await send({"type": "http.response.start", "status": 200, "headers": []})
                await send({"type": "http.response.body", "body": b"ok", "more_body": False})
                return

    async def receive():
        return {"type": "http.request", "body": b"0123456789", "more_body": False}

    async def send(message):
        messages.append(message)

    middleware = FormulationRequestSizeLimitMiddleware(
        app,
        request_limits={"/proyectos/analizar-formulacion": 8},
    )
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/proyectos/analizar-formulacion",
        "headers": [],
    }

    asyncio.run(middleware(scope, receive, send))

    assert app_called is True
    assert messages[0]["type"] == "http.response.start"
    assert messages[0]["status"] == 413
    assert "límite" in messages[1]["body"].decode().lower()


def test_formulation_request_limit_forwards_valid_body_and_tracks_response():
    messages = []
    received = []

    async def app(_scope, receive, send):
        received.append(await receive())
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok", "more_body": False})

    async def receive():
        return {"type": "http.request", "body": b"valid", "more_body": False}

    async def send(message):
        messages.append(message)

    middleware = FormulationRequestSizeLimitMiddleware(
        app,
        request_limits={"/proyectos/analizar-formulacion": 8},
    )
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/proyectos/analizar-formulacion",
        "headers": [(b"content-length", b"5")],
    }

    asyncio.run(middleware(scope, receive, send))

    assert received == [{"type": "http.request", "body": b"valid", "more_body": False}]
    assert [message["status"] for message in messages if message["type"] == "http.response.start"] == [200]
    assert messages[-1]["body"] == b"ok"
