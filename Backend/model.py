import logging
from contextlib import asynccontextmanager

import joblib
from fastapi import FastAPI

from config import MODEL_PATH

logger = logging.getLogger("guardrail")

state = {}  # holds the model for the life of the server


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs ONCE at startup
    if MODEL_PATH.exists():
        state["model"] = joblib.load(MODEL_PATH)
        logger.info("Model loaded from %s", MODEL_PATH)
    else:
        state["model"] = None
        logger.warning("No model file at %s", MODEL_PATH)
    yield
    state.clear()


def predict(text: str) -> tuple[str, float]:
    # TESTING STUB: replace with the real model call later
    return "testing", 1.0