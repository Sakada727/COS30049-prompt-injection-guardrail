import logging
from contextlib import asynccontextmanager

import joblib
import scipy.sparse as sp
from fastapi import FastAPI

from app.db import History
from app.model.normalise import prepare
from app.security.inference import InferenceGuard
from config import MODEL_PATH, settings

logger = logging.getLogger("guardrail")

# Kept at module level so each worker process can import load/predict by name
_bundle = None


def load(path=MODEL_PATH):
    global _bundle
    _bundle = joblib.load(path)


def model_loaded() -> bool:
    return _bundle is not None


def vectorise(word_vec, char_vec, texts):
    return sp.hstack([word_vec.transform(texts), char_vec.transform(texts)]).tocsr()


def predict(text: str) -> tuple[str, float]:
    b = _bundle
    p = b["model"].predict_proba(vectorise(b["word_vec"], b["char_vec"], [prepare(text)]))[0, 1]
    blocked = p >= b["threshold"]
    return ("blocked" if blocked else "allowed"), float(p if blocked else 1 - p)


@asynccontextmanager
async def lifespan(app: FastAPI):
    for switch in settings.demo_switches_on():
        logger.warning("DEMO SWITCH ON: %s (a defence is turned off)", switch)
    if not MODEL_PATH.exists():
        raise RuntimeError(f"No model file at {MODEL_PATH}")
    load()
    logger.info("Model loaded from %s", MODEL_PATH)

    guard = InferenceGuard(predict, settings, initializer=load, initargs=(MODEL_PATH,))
    await guard.warm_up()
    app.state.guard = guard
    app.state.history = History(settings)
    yield
    guard.close()
