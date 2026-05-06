from sqlmodel import SQLModel, create_engine, Session
from .config import settings
import os

# Database configuration
# Use SQLite for local development if POSTGRES_URL is not set
DATABASE_URL = settings.POSTGRES_URL if hasattr(settings, 'POSTGRES_URL') and settings.POSTGRES_URL else "sqlite:///./spectra.db"

# Create engine with robust connection pooling for production (Postgres)
if "sqlite" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL, 
        echo=False, 
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL, 
        echo=False,
        pool_size=20,           # Number of connections to keep open
        max_overflow=10,        # Number of additional connections when pool is full
        pool_timeout=30,        # Seconds to wait before giving up on getting a connection
        pool_pre_ping=True,     # Verify connection is alive before using it
        pool_recycle=1800       # Reconnect after 30 minutes to avoid stale connections
    )


def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
