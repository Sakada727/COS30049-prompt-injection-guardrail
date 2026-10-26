"""
STAND-IN app for attacking the security modules before the real back end exists.

It wires app/db.py, app/security/* and app/model/normalise.py together exactly the way
INTERFACE.md asks the real main.py and routes to, with the smallest possible routes.
It is not the real app: once main.py, routes, schemas and errors.py are written, point
the lab scripts at the real API with --target and delete this file.

Run it from backend/ (settings come from PIG_ environment variables or .env):
  python -m uvicorn --factory lab.harness_app:create_app --port 8000
"""
from contextlib import asynccontextmanager
import logging
import uuid

import joblib
from fastapi import FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.db import History
from app.model.normalise import prepare
from app.security.inference import InferenceGuard, ServerBusy
from app.security.limits import BodySizeLimit, error_body
from app.security.settings import get_settings
from lab.common import MODEL_PATH, vectorise


# The model lives in a module-level variable, and load/predict are plain functions, so that
# in "process" mode each worker process can import them by name and load its own copy.
_bundle = None


def load(path=MODEL_PATH):
    global _bundle
    _bundle = joblib.load(path)


def predict(text):
    b = _bundle
    p = b["model"].predict_proba(vectorise(b["word_vec"], b["char_vec"], [prepare(text)]))[0, 1]
    blocked = p >= b["threshold"]
    return ("blocked" if blocked else "allowed"), float(p if blocked else 1 - p)


def build_app(settings):
    @asynccontextmanager
    async def lifespan(app):
        for switch in settings.demo_switches_on():          # make a defence that is off impossible to miss
            logging.getLogger("uvicorn.error").warning("DEMO SWITCH ON: %s (a defence is disabled)", switch)
        guard = InferenceGuard(predict, settings, initializer=load, initargs=(MODEL_PATH,))
        await guard.warm_up()                               # load the model in every worker now
        app.state.guard = guard
        app.state.history = History(settings)
        yield
        app.state.guard.close()

    app = FastAPI(lifespan=lifespan)
    app.add_middleware(BodySizeLimit, max_bytes=settings.max_body_bytes,
                       enabled=not settings.demo_disable_dos_defence)

    class CheckIn(BaseModel):
        text: str = Field(min_length=1, max_length=settings.max_text_chars)

    @app.exception_handler(RequestValidationError)
    async def invalid(request, exc):
        # Say which part was wrong, but never echo the input back: FastAPI's default 422
        # would return the whole text
        if any(e["loc"][0] == "header" for e in exc.errors()):
            message = "The X-Session-ID header must be a UUID."
        else:
            message = f'The body must be JSON like {{"text": "..."}} with 1 to {settings.max_text_chars:,} characters.'
        return JSONResponse(error_body("invalid_input", message), status_code=422)

    @app.exception_handler(ServerBusy)
    async def busy(request, exc):
        return JSONResponse(error_body("server_busy", exc.message), status_code=503,
                            headers={"Retry-After": str(exc.retry_after)})

    @app.post("/api/check")
    async def check(body: CheckIn, request: Request, x_session_id: uuid.UUID = Header()):
        label, confidence = await request.app.state.guard.run(body.text)
        row_id = request.app.state.history.save_check(x_session_id, body.text, label, confidence)
        return {"id": row_id, "label": label, "confidence": confidence}

    @app.get("/api/history")
    async def history(request: Request, x_session_id: uuid.UUID = Header()):
        return {"items": request.app.state.history.list_checks(x_session_id)}

    @app.get("/api/health")
    async def health():
        return {"status": "ok"}

    return app


def create_app():
    load()                                       # this process's copy (thread mode, and the demo switch)
    return build_app(get_settings())
