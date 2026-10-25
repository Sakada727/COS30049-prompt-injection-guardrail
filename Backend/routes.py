from fastapi import APIRouter, HTTPException

from model import predict, state
from schemas import CheckRequest, CheckResult, HealthResult

router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResult)
def health():
    return HealthResult(status="ok", model_loaded=state.get("model") is not None)


@router.post("/check", response_model=CheckResult)
def check(req: CheckRequest):
    if not req.text.strip():
        raise HTTPException(status_code=422, detail="Message must not be blank.")
    label, confidence = predict(req.text)
    return CheckResult(label=label, confidence=confidence)