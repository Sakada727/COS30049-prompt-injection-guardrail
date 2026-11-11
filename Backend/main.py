import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.security.limits import BodySizeLimit
from config import FRONTEND_ORIGIN, settings
from errors import register_error_handlers
from model import lifespan
from routes import router

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Prompt Injection Guardrail",
    description="Checks a message for prompt injection before it reaches a language model. "
                "Every error comes back as `{\"error\": {\"code\", \"message\"}}`.",
    version="1.0.0",
    lifespan=lifespan,
)

#Added before CORS so CORS wraps it and a 413 still reaches the browser
app.add_middleware(BodySizeLimit, max_bytes=settings.max_body_bytes,
                   enabled=not settings.demo_disable_dos_defence)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "X-Session-ID"],
    expose_headers=["Retry-After"],
)

app.include_router(router)
register_error_handlers(app)
