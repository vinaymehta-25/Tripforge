import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.security import read_access_token
from app.db import get_db
from app.models import Trip, TripMember, User


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme), db: Session = Depends(get_db)) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in to continue.")
    subject = read_access_token(credentials.credentials)
    if subject is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session has expired. Sign in again.")
    try:
        user_id = int(subject)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid sign-in token.")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not found.")
    return user


def trip_role(db: Session, trip_id: int, user: User) -> tuple[Trip, str]:
    trip = db.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.owner_id == user.id:
        return trip, "owner"
    member = db.scalar(select(TripMember).where(
        TripMember.trip_id == trip_id,
        TripMember.user_id == user.id,
        TripMember.accepted_at.is_not(None),
    ))
    if member is None:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return trip, member.role


def require_editor(db: Session, trip_id: int, user: User) -> Trip:
    trip, role = trip_role(db, trip_id, user)
    if role == "viewer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You have read-only access to this trip.")
    return trip


def make_invite_token() -> str:
    return secrets.token_urlsafe(32)
