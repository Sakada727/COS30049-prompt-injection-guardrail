from pydantic import BaseModel, Field

from config import MAX_TEXT_LENGTH


class CheckRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT_LENGTH)


class CheckResult(BaseModel):
    label: str
    confidence: float


class HealthResult(BaseModel):
    status: str
    model_loaded: bool