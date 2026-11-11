from typing import Literal

from pydantic import BaseModel, Field

from config import MAX_TEXT_LENGTH

Label = Literal["blocked", "allowed"]


class CheckRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT_LENGTH)


class CheckResult(BaseModel):
    id: int
    label: Label
    confidence: float


class HistoryItem(BaseModel):
    id: int
    text: str
    label: Label
    confidence: float
    created_at: str


class HistoryResult(BaseModel):
    items: list[HistoryItem]


class HealthResult(BaseModel):
    status: str
    model_loaded: bool
