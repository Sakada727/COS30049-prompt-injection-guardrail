"""
Every setting the back end reads, in one place (like config.py in A2).

Values come from environment variables prefixed PIG_, or from backend/.env
(git-ignored; copy .env.example). Nothing secret is written in source code.
Each limit is justified in SECURITY.md.
"""
from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PIG_", env_file=".env", extra="ignore")

    # CORS: the one front-end origin allowed to call the API
    allowed_origin: str = "http://localhost:5173"

    # 8,000 characters keeps 99.4% of the training prompts (A2 data, see SECURITY.md)
    max_text_chars: int = Field(8000, ge=1, le=100_000)

    # History of past checks. A Postgres URL would contain a password, which is why
    # this is read from the environment rather than written in code.
    database_url: str = "sqlite:///./pig_history.db"
    history_limit: int = Field(50, ge=1, le=500)       # rows returned per session
    sql_echo: bool = False                             # print every SQL statement (for the demo)

    # Denial-of-service guard (security/inference.py)
    # Kind of worker the model runs in. "process" keeps the server responsive during a flood
    # (each process has its own GIL) at the cost of one model copy per worker; step 3 measures both.
    inference_mode: Literal["thread", "process"] = "process"
    inference_workers: int = Field(2, ge=1, le=32)    # model calls running at once
    inference_queue: int = Field(8, ge=0, le=1000)    # extra requests allowed to wait
    queue_timeout_s: float = Field(2.0, gt=0, le=60)  # longest a request may wait for a slot

    # Path to the Assignment 2 folder. Only the measurement scripts need it.
    a2_dir: str = "../../COS30049_A2_Group8"

    # DEMO SWITCHES: turn one defence off to record the "before" half of a
    # before/after demo. Never set these outside a local demo.
    demo_disable_sql_defence: bool = False
    demo_disable_dos_defence: bool = False
    demo_disable_normaliser: bool = False

    @field_validator("allowed_origin")
    @classmethod
    def exact_origin(cls, value):
        # An origin is scheme://host[:port] and nothing else, so "*" or a path is rejected
        parts = urlsplit(value)
        if parts.scheme not in ("http", "https") or not parts.hostname or value != f"{parts.scheme}://{parts.netloc}":
            raise ValueError("must be one exact origin such as http://localhost:5173, not '*' and no trailing slash")
        return value

    @property
    def max_body_bytes(self):
        # 4 bytes is the most one character can take in UTF-8, plus 1 KB for the JSON around the text
        return self.max_text_chars * 4 + 1024

    def demo_switches_on(self):
        return [name for name in ("demo_disable_sql_defence", "demo_disable_dos_defence",
                                  "demo_disable_normaliser") if getattr(self, name)]


@lru_cache
def get_settings():
    return Settings()
