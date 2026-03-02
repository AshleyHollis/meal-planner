"""JWT auth middleware with Auth0 validation and household auto-provisioning."""

import json
import urllib.request
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from shared.config import get_settings
from shared.db.connection import get_session
from shared.db.models.household import Household, HouseholdMember
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

_bearer = HTTPBearer()

# Cached JWKS (module-level, refreshed on miss)
_jwks: dict | None = None


async def _fetch_jwks(domain: str) -> dict:
    """Fetch JSON Web Key Set from Auth0."""
    global _jwks
    url = f"https://{domain}/.well-known/jwks.json"
    with urllib.request.urlopen(url, timeout=10) as resp:  # nosec B310 - URL is always https
        _jwks = json.loads(resp.read())
    return _jwks


async def _get_jwks(domain: str) -> dict:
    """Return cached JWKS or fetch from Auth0."""
    if _jwks is not None:
        return _jwks
    return await _fetch_jwks(domain)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """FastAPI dependency: validate Bearer JWT and return decoded claims.

    Returns the decoded token payload dict with at minimum a ``sub`` claim.
    """
    settings = get_settings()
    domain = settings.auth.domain
    token = credentials.credentials

    if not domain:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Auth0 domain not configured",
        )

    try:
        jwks = await _get_jwks(domain)
        unverified_header = jwt.get_unverified_header(token)

        rsa_key: dict = {}
        for key in jwks.get("keys", []):
            if key["kid"] == unverified_header.get("kid"):
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"],
                }
                break

        if not rsa_key:
            # Key not found – JWKS may be stale, refresh once
            jwks = await _fetch_jwks(domain)
            for key in jwks.get("keys", []):
                if key["kid"] == unverified_header.get("kid"):
                    rsa_key = {
                        "kty": key["kty"],
                        "kid": key["kid"],
                        "use": key["use"],
                        "n": key["n"],
                        "e": key["e"],
                    }
                    break

        if not rsa_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find appropriate signing key",
            )

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.auth.audience or settings.auth.client_id,
            issuer=f"https://{domain}/",
        )
        return payload  # noqa: TRY300

    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {exc}",
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {type(exc).__name__}: {exc}",
        ) from exc


async def get_current_household_id(
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UUID:
    """FastAPI dependency: resolve auth0 user to household, auto-provision on first login.

    Looks up HouseholdMember by auth0_user_id (JWT ``sub`` claim).
    If not found, creates a new Household + HouseholdMember (owner role).
    Returns the household UUID.
    """
    auth0_user_id: str = user["sub"]

    result = await session.execute(
        select(HouseholdMember).where(HouseholdMember.auth0_user_id == auth0_user_id)
    )
    member = result.scalar_one_or_none()

    if member is not None:
        return member.household_id

    # Auto-provision: create household + member on first login
    household = Household(name="My Household")
    session.add(household)
    await session.flush()  # populate household.id

    new_member = HouseholdMember(
        household_id=household.id,
        auth0_user_id=auth0_user_id,
        display_name=user.get("name", user.get("email", "User")),
        role="owner",
    )
    session.add(new_member)
    await session.flush()

    return household.id
