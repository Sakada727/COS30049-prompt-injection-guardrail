"""
Request-size limit, enforced before the body is read.

Pydantic's max_length on the text field only runs after the whole body has arrived and
been parsed, so on its own it still lets a 200 MB request be read into memory first.
This middleware:
  - refuses a request whose Content-Length is over the limit, without reading it
  - stops reading a request that has no Content-Length (chunked upload) as soon as
    it passes the limit
Both answer 413 in the team's error format.

Add it in main.py:  app.add_middleware(BodySizeLimit, max_bytes=s.max_body_bytes,
                                       enabled=not s.demo_disable_dos_defence)
"""
import json


def error_body(code, message):
    """The one JSON shape every error uses. errors.py should build its responses with this too."""
    return {"error": {"code": code, "message": message}}


async def send_error(send, status, code, message):
    body = json.dumps(error_body(code, message)).encode()
    await send({"type": "http.response.start", "status": status,
                "headers": [(b"content-type", b"application/json"),
                            (b"content-length", str(len(body)).encode())]})
    await send({"type": "http.response.body", "body": body})


class BodySizeLimit:
    def __init__(self, app, max_bytes, enabled=True):
        self.app, self.max_bytes, self.enabled = app, max_bytes, enabled

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not self.enabled:
            return await self.app(scope, receive, send)

        too_big = f"The request body is larger than the {self.max_bytes:,}-byte limit."
        declared = dict(scope["headers"]).get(b"content-length")
        if declared is not None:
            if not declared.isdigit():
                return await send_error(send, 400, "bad_request", "Content-Length must be a whole number.")
            if int(declared) > self.max_bytes:
                return await send_error(send, 413, "payload_too_large", too_big)

        received, rejected = 0, False

        async def receive_limited():
            nonlocal received, rejected
            if rejected:
                return {"type": "http.disconnect"}
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    # Answer now, then tell the app the client left so it stops reading
                    rejected = True
                    await send_error(send, 413, "payload_too_large", too_big)
                    return {"type": "http.disconnect"}
            return message

        async def send_unless_rejected(message):
            if not rejected:                 # we already answered; drop the app's reply
                await send(message)

        await self.app(scope, receive_limited, send_unless_rejected)
