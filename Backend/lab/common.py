"""
Shared helpers for the lab scripts: paths, reading the A2 data, and the three
"targets" an attack can be pointed at. Nothing in lab/ is imported by the app.

  DirectTarget  the deployed model called in-process (same steps as the API)
  A2Target      the Assignment 2 system as it was, for comparison
  HttpTarget    the running API, once the back end exists
"""
from pathlib import Path
import uuid

import joblib
import numpy as np
import pandas as pd
import scipy.sparse as sp

from app.model.normalise import a2_normalize, prepare
from app.security.settings import get_settings

ROOT = Path(__file__).resolve().parents[1]          # backend/
MODEL_PATH = ROOT / "models" / "guardrail.joblib"
TAB_DIR = ROOT / "reports" / "tables"
FIG_DIR = ROOT / "reports" / "figures"
for d in (TAB_DIR, FIG_DIR):
    d.mkdir(parents=True, exist_ok=True)


def a2_path(*parts):
    path = (ROOT / get_settings().a2_dir).resolve().joinpath(*parts)
    if not path.exists():
        raise SystemExit(f"Not found: {path}\nSet PIG_A2_DIR in backend/.env to your Assignment 2 folder.")
    return path


def load_a2_csv(name):
    # Read exactly as TFIDF.ipynb did (blank or "NA" text becomes ""), so texts match training
    df = pd.read_csv(a2_path("data", "processed", f"{name}.csv"))
    df["text"] = df["text"].fillna("").astype(str)
    return df


def vectorise(word_vec, char_vec, texts):
    return sp.hstack([word_vec.transform(texts), char_vec.transform(texts)]).tocsr()


class DirectTarget:
    name = "A3 model (in-process)"

    def __init__(self, normalise=True, path=MODEL_PATH):
        self.bundle = joblib.load(path)
        self.normalise = normalise

    def attack_probability(self, texts):
        b = self.bundle
        cleaned = [prepare(t, enabled=self.normalise) for t in texts]
        return b["model"].predict_proba(vectorise(b["word_vec"], b["char_vec"], cleaned))[:, 1]

    def blocked(self, texts):
        return self.attack_probability(texts) >= self.bundle["threshold"]


class A2Target:
    name = "A2 system"

    def __init__(self):
        self.word_vec = joblib.load(a2_path("models", "tfidf_word.joblib"))
        self.char_vec = joblib.load(a2_path("models", "tfidf_char.joblib"))
        self.svm = joblib.load(a2_path("models", "svm", "svm_model.joblib"))

    def blocked(self, texts):
        cleaned = [a2_normalize(t) for t in texts]
        return self.svm.predict(vectorise(self.word_vec, self.char_vec, cleaned)) == 1


class HttpTarget:
    """POST /api/check on the running back end. An input the API refuses (413/422) counts as
    blocked, because the guardrail never let it through."""
    name = "API"

    def __init__(self, base_url):
        import httpx
        self.client = httpx.Client(base_url=base_url, timeout=30,
                                   headers={"X-Session-ID": str(uuid.uuid4())})

    def check(self, text):
        r = self.client.post("/api/check", json={"text": text})
        if r.status_code in (413, 422):
            return {"label": "blocked", "confidence": None, "status": r.status_code}
        r.raise_for_status()
        return {**r.json(), "status": r.status_code}

    def blocked(self, texts):
        return np.array([self.check(t)["label"] == "blocked" for t in texts])
