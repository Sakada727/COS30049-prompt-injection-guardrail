import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.security.inference import ServerBusy
from app.security.limits import error_body

logger = logging.getLogger("guardrail")


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def invalid_input(request: Request, exc: RequestValidationError):
        first = exc.errors()[0]
        if first["loc"][0] == "header":
            message = "The X-Session-ID header must be a UUID."
        else:
            message = first.get("msg", "invalid input")
        return JSONResponse(error_body("invalid_input", message), status_code=422)

    @app.exception_handler(ServerBusy)
    async def server_busy(request: Request, exc: ServerBusy):
        return JSONResponse(error_body("server_busy", exc.message), status_code=503,
                            headers={"Retry-After": str(exc.retry_after)})

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request: Request, exc: StarletteHTTPException):
        if exc.status_code == 422:
            code = "invalid_input"
        else:
            code = HTTPStatus(exc.status_code).phrase.lower().replace(" ", "_")
        return JSONResponse(error_body(code, str(exc.detail)), status_code=exc.status_code,
                            headers=getattr(exc, "headers", None))

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception):
        logger.exception("Unhandled error")  # full trace stays in the server log
        return JSONResponse(error_body("internal_error", "Something went wrong. Please try again later."),
                            status_code=500)
