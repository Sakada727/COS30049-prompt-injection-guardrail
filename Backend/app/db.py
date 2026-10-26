"""
History of past checks, stored in SQLite through SQLAlchemy.

SQL injection defence: every query the app makes is in this file, and every one passes
user input as a bound parameter (the ORM sends "VALUES (?, ?, ...)" and the values
separately), so text such as  ' OR '1'='1  is stored and returned as plain data.
Routes call save_check / list_checks / clear_checks and never write SQL themselves.

History is scoped to a session ID (a random UUID the front end makes per browser tab),
so one visitor never sees another visitor's prompts.
"""
from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, Float, String, Text, create_engine, delete, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


class Base(DeclarativeBase):
    pass


class Check(Base):
    __tablename__ = "checks"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(String(36), index=True)
    text: Mapped[str] = mapped_column(Text)
    label: Mapped[str] = mapped_column(String(7))           # "allowed" or "blocked"
    confidence: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime)  # UTC

    def as_dict(self):
        return {"id": self.id, "text": self.text, "label": self.label,
                "confidence": self.confidence, "created_at": self.created_at.isoformat() + "Z"}


class History:
    def __init__(self, settings):
        sqlite = settings.database_url.startswith("sqlite")
        self.engine = create_engine(settings.database_url, echo=settings.sql_echo,
                                    connect_args={"check_same_thread": False} if sqlite else {})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(self.engine, expire_on_commit=False)
        self.limit = settings.history_limit
        self.unsafe = settings.demo_disable_sql_defence

    def save_check(self, session_id: uuid.UUID, text: str, label: str, confidence: float) -> int:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if self.unsafe:
            return self._save_check_unsafe(session_id, text, label, confidence, now)
        with self.Session() as db:
            row = Check(session_id=str(session_id), text=text, label=label,
                        confidence=confidence, created_at=now)
            db.add(row)
            db.commit()
            return row.id

    def _save_check_unsafe(self, session_id, text, label, confidence, now):
        # DEMO ONLY (PIG_DEMO_DISABLE_SQL_DEFENCE=true): the vulnerable version.
        # The prompt is pasted into the SQL text, so a quote in it ends the string
        # and whatever follows is run as SQL.
        sql = (f"INSERT INTO checks (session_id, text, label, confidence, created_at) "
               f"VALUES ('{session_id}', '{text}', '{label}', {confidence}, "
               f"'{now:%Y-%m-%d %H:%M:%S.%f}')")
        with self.engine.begin() as conn:
            conn.exec_driver_sql(sql)
            return conn.exec_driver_sql("SELECT last_insert_rowid()").scalar()

    def list_checks(self, session_id: uuid.UUID) -> list[dict]:
        with self.Session() as db:
            rows = db.scalars(select(Check).where(Check.session_id == str(session_id))
                              .order_by(Check.id.desc()).limit(self.limit))
            return [r.as_dict() for r in rows]

    def clear_checks(self, session_id: uuid.UUID) -> int:
        with self.Session() as db:
            deleted = db.execute(delete(Check).where(Check.session_id == str(session_id))).rowcount
            db.commit()
            return deleted
