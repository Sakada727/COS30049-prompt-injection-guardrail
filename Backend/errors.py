import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("guardrail")


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def invalid_input(request: Request, exc: RequestValidationError):
        first = exc.errors()[0]
        return JSONResponse(
            status_code=422,
            content={"error": "invalid input", "detail": first.get("msg", "invalid input")},
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": HTTPStatus(exc.status_code).phrase.lower(), "detail": str(exc.detail)},
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception):
        logger.exception("Unhandled error")  # full trace stays in the server log
        return JSONResponse(
            status_code=500,
            content={"error": "internal error", "detail": "please try again later"},
        )