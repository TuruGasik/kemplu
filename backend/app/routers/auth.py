from uuid import uuid4
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db, get_redis
from app.models.user import User
from app.services.huawei_auth import HuaweiAuthService
from app.services.scheduler import trigger_first_login_sync

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()
logger = logging.getLogger(__name__)


def oauth_cookie_secure() -> bool:
    if settings.oauth_state_cookie_secure is not None:
        return settings.oauth_state_cookie_secure
    return str(settings.huawei_redirect_uri).startswith("https://")


@router.get("/huawei/login")
async def huawei_login(response: Response, redis: Redis = Depends(get_redis)) -> dict[str, str]:
    service = HuaweiAuthService(redis)
    auth_url, state = service.build_auth_url()
    await redis.set(f"oauth:state:{state}", "pending", ex=settings.oauth_state_cookie_max_age_seconds)
    response.set_cookie(
        key=settings.oauth_state_cookie_name,
        value=state,
        httponly=True,
        secure=oauth_cookie_secure(),
        samesite=settings.oauth_state_cookie_samesite,
        max_age=settings.oauth_state_cookie_max_age_seconds,
        path="/",
    )
    return {"auth_url": auth_url, "state": state}


@router.get("/huawei/callback")
async def huawei_callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> RedirectResponse:
    saved_state = request.cookies.get(settings.oauth_state_cookie_name)
    logger.info(
        "Huawei OAuth callback: query code present=%s query state=%s cookie state=%s all cookies=%s",
        bool(code),
        state,
        saved_state,
        dict(request.cookies),
    )
    if not saved_state or saved_state != state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OAuth state")

    state_key = f"oauth:state:{state}"
    state_value = await redis.get(state_key)
    if not state_value:
        logger.warning("Huawei OAuth state matched cookie but was missing from Redis: %s", state)
    else:
        await redis.delete(state_key)

    service = HuaweiAuthService(redis)
    token_payload = await service.exchange_code(code)
    huawei_user_id = str(
        token_payload.get("unionid")
        or token_payload.get("openid")
        or token_payload.get("user_id")
        or token_payload.get("sub")
        or uuid4()
    )

    result = await db.execute(select(User).where(User.huawei_user_id == huawei_user_id))
    user = result.scalar_one_or_none()
    is_new_user = user is None
    if user is None:
        user = User(huawei_user_id=huawei_user_id, display_name=token_payload.get("display_name"))
        db.add(user)
        await db.commit()
        await db.refresh(user)

    await service.store_tokens(str(user.id), token_payload)
    if is_new_user:
        try:
            await trigger_first_login_sync(user.id)
        except Exception as exc:
            logger.error("Initial sync failed for user %s (login still succeeded): %s", user.id, exc)
    session_token = service.create_session_token(str(user.id))
    redirect_url = f"{settings.frontend_url}/auth/callback?token={session_token}"
    redirect_response = RedirectResponse(url=redirect_url)
    redirect_response.delete_cookie(settings.oauth_state_cookie_name, path="/")
    return redirect_response


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    authorization: str | None = Header(default=None),
    redis: Redis = Depends(get_redis),
) -> Response:
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
        service = HuaweiAuthService(redis)
        try:
            user_id = service.verify_session_token(token)
            await service.revoke_token(user_id)
        except Exception:
            pass
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
