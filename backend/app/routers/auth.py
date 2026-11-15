from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.security import create_access_token, hash_password, verify_password
from app.db import get_db
from app.deps import get_current_user
from app.models import TripMember, User, utcnow
from app.schemas import AcceptInvite, AuthOut, LoginIn, RegisterIn, UserOut


router = APIRouter(prefix="/auth", tags=["authentication"])


def auth_response(user: User) -> AuthOut:
    return AuthOut(access_token=create_access_token(str(user.id)), user=UserOut.model_validate(user))


@router.post("/register", response_model=AuthOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(email=email, full_name=payload.full_name.strip(), password_hash=hash_password(payload.password))
    db.add(user)
    db.flush()
    pending = db.scalars(select(TripMember).where(
        TripMember.email == email,
        TripMember.user_id.is_(None),
        TripMember.accepted_at.is_(None),
    )).all()
    for invite in pending:
        invite.user_id = user.id
    db.commit()
    db.refresh(user)
    return auth_response(user)


@router.post("/login", response_model=AuthOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return auth_response(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.get("/invitations")
def invitations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pending = db.scalars(select(TripMember).where(
        TripMember.user_id == user.id,
        TripMember.accepted_at.is_(None),
    )).all()
    return [{
        "id": invite.id,
        "trip_id": invite.trip_id,
        "trip_title": invite.trip.title,
        "destination_name": invite.trip.destination_name,
        "role": invite.role,
        "token": invite.invite_token,
        "invited_by": invite.trip.owner.full_name,
    } for invite in pending]


@router.post("/invitations/accept")
def accept_invite(payload: AcceptInvite, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    invite = db.scalar(select(TripMember).where(TripMember.invite_token == payload.token))
    if invite is None or invite.email.lower() != user.email.lower() or invite.user_id not in (None, user.id):
        raise HTTPException(status_code=404, detail="This invitation is not available for your account.")
    invite.user_id = user.id
    invite.accepted_at = utcnow()
    db.commit()
    return {"ok": True, "trip_id": invite.trip_id}
