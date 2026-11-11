import uuid
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Request

from model import model_loaded
from schemas import CheckRequest, CheckResult, HealthResult, HistoryResult

router = APIRouter(prefix="/api")

# The front end sends a random UUID per browser tab so each tab only sees its own history
SessionId = Annotated[uuid.UUID, Header(alias="X-Session-ID")]


@router.get("/health", response_model=HealthResult)
def health():
    return HealthResult(status="ok", model_loaded=model_loaded())


@router.post("/check", response_model=CheckResult)
async def check(req: CheckRequest, request: Request, session_id: SessionId):
    if not req.text.strip():
        raise HTTPException(status_code=422, detail="Message must not be blank.")
    label, confidence = await request.app.state.guard.run(req.text)
    row_id = request.app.state.history.save_check(session_id, req.text, label, confidence)
    return CheckResult(id=row_id, label=label, confidence=confidence)


@router.get("/history", response_model=HistoryResult)
def history(request: Request, session_id: SessionId):
    return HistoryResult(items=request.app.state.history.list_checks(session_id))
