import uuid
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Request

from config import MAX_TEXT_LENGTH, settings
from model import model_loaded
from schemas import CheckRequest, CheckResult, ClearResult, ErrorBody, HealthResult, HistoryResult

router = APIRouter(prefix="/api")

#The front end sends a random UUID per browser tab so each tab only sees its own history
SessionId = Annotated[uuid.UUID, Header(alias="X-Session-ID", description="A random UUID, one per browser tab")]

TOO_BIG = (413, "The body is over the size limit. It is refused before it's read.",
           "payload_too_large", f"The request body is larger than the {settings.max_body_bytes:,}-byte limit.")
BAD_TEXT = (422, f"Blank text, over {MAX_TEXT_LENGTH:,} characters, or a bad X-Session-ID",
            "invalid_input", "Message must not be blank.")
BAD_SESSION = (422, "Missing or bad X-Session-ID", "invalid_input", "The X-Session-ID header must be a UUID.")
BUSY = (503, "Every worker is busy and the queue is full. Comes with a Retry-After header.",
        "server_busy", "The server is busy. Please try again in a moment.")


def errors(*cases):
    return {status: {"model": ErrorBody, "description": description,
                     "content": {"application/json": {"example": {"error": {"code": code, "message": message}}}}}
            for status, description, code, message in cases}


@router.get("/health", response_model=HealthResult, summary="Is the server up?")
def health():
    """Whether the server is running, whether the model loaded, and the longest message it accepts."""
    return HealthResult(status="ok", model_loaded=model_loaded(), max_text_chars=MAX_TEXT_LENGTH)


@router.post("/check", response_model=CheckResult, responses=errors(TOO_BIG, BAD_TEXT, BUSY),
             summary="Check one message")
async def check(req: CheckRequest, request: Request, session_id: SessionId):
    """Runs the message through the model and saves the result to this session's history.

    `label` is `blocked` when the chance of an injection is 0.5 or more. `confidence` is how sure
    the model is of that label. A 503 comes with a `Retry-After` header.
    """
    if not req.text.strip():
        raise HTTPException(status_code=422, detail="Message must not be blank.")
    label, confidence = await request.app.state.guard.run(req.text)
    row_id = request.app.state.history.save_check(session_id, req.text, label, confidence)
    return CheckResult(id=row_id, label=label, confidence=confidence)


@router.get("/history", response_model=HistoryResult, responses=errors(BAD_SESSION),
            summary="This session's past checks")
def history(request: Request, session_id: SessionId):
    """The most recent checks made with this `X-Session-ID` (50 by default), newest first."""
    return HistoryResult(items=request.app.state.history.list_checks(session_id))


@router.delete("/history", response_model=ClearResult, responses=errors(BAD_SESSION),
               summary="Delete this session's past checks")
def clear_history(request: Request, session_id: SessionId):
    """Removes every check saved under this `X-Session-ID`. The front end calls it when you clear the history."""
    return ClearResult(deleted=request.app.state.history.clear_checks(session_id))
