from pathlib import Path

from app.security.settings import get_settings

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "guardrail.joblib"

# Everything else comes from PIG_ environment variables or .env (see .env.example)
settings = get_settings()
FRONTEND_ORIGIN = settings.allowed_origin
MAX_TEXT_LENGTH = settings.max_text_chars
