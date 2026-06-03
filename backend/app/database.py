from collections.abc import AsyncGenerator

from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(str(settings.database_url), echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
redis_client = Redis.from_url(str(settings.redis_url), decode_responses=True)


class DeclarativeBaseModel(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def get_redis() -> AsyncGenerator[Redis, None]:
    yield redis_client


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(DeclarativeBaseModel.metadata.create_all)
        await conn.execute(text("ALTER TABLE activity_sessions ADD COLUMN IF NOT EXISTS activity_type VARCHAR(64)"))
        await conn.execute(text("ALTER TABLE activity_sessions ADD COLUMN IF NOT EXISTS activity_group VARCHAR(64)"))
        await conn.execute(text("ALTER TABLE activity_sessions ADD COLUMN IF NOT EXISTS activity_label VARCHAR(128)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_activity_sessions_activity_type ON activity_sessions (activity_type)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_activity_sessions_activity_group ON activity_sessions (activity_group)"))


async def close_connections() -> None:
    await engine.dispose()
    await redis_client.aclose()
