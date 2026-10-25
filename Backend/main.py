import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import FRONTEND_ORIGIN
from errors import register_error_handlers
from model import lifespan
from routes import router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Prompt Injection Guardrail", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(router)
register_error_handlers(app)