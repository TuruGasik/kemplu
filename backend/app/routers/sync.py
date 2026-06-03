from datetime import UTC, datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.sync_log import SyncLog
from app.models.user import User
from app.services.scheduler import sync_user_data

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("/trigger", status_code=status.HTTP_202_ACCEPTED)
async def trigger_sync(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    sync_log = SyncLog(
        user_id=user.id,
        sync_type="manual",
        status="queued",
        records_fetched=0,
        created_at=datetime.now(UTC),
    )
    db.add(sync_log)
    await db.commit()
    await sync_user_data(user.id, days=7, sync_type="manual")
    return {"status": "queued", "sync_log_id": str(sync_log.id)}
