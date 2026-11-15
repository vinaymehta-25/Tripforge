from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.db import get_db
from app.deps import get_current_user, make_invite_token, require_editor, trip_role
from app.models import Activity, Destination, Expense, ItineraryDay, Trip, TripMember, User, utcnow
from app.schemas import (
    ActivityCreate, ActivityUpdate, DayCreate, DayUpdate, ExpenseCreate, ExpenseUpdate,
    InviteCreate, MemberOut, MemberUpdate, TripCreate, TripDetail, TripOut, TripUpdate,
)


router = APIRouter(prefix="/trips", tags=["trips"])


def load_trip(db: Session, trip_id: int) -> Trip:
    trip = db.scalar(select(Trip).where(Trip.id == trip_id).options(
        selectinload(Trip.days).selectinload(ItineraryDay.activities),
        selectinload(Trip.expenses).selectinload(Expense.paid_by),
    ))
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return trip


def detail_payload(trip: Trip, role: str) -> dict:
    return {**TripOut.model_validate(trip).model_dump(), "days": trip.days, "expenses": trip.expenses, "role": role}


def member_payload(member: TripMember, request: Request, expose_invite: bool = True) -> dict:
    return {
        "id": member.id, "user_id": member.user_id, "email": member.email,
        "full_name": member.user.full_name if member.user else None, "role": member.role,
        "accepted": member.accepted_at is not None,
        "invite_url": None if member.accepted_at or not expose_invite else str(request.base_url).rstrip("/") + "/join/" + member.invite_token,
    }


@router.get("", response_model=list[TripOut])
def list_trips(status_filter: str = Query(default="all", alias="status", pattern="^(all|upcoming|past)$"),
               db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ids = set(db.scalars(select(Trip.id).where(Trip.owner_id == user.id)).all())
    ids.update(db.scalars(select(TripMember.trip_id).where(TripMember.user_id == user.id, TripMember.accepted_at.is_not(None))).all())
    if not ids:
        return []
    statement = select(Trip).where(Trip.id.in_(ids))
    if status_filter == "upcoming":
        statement = statement.where(Trip.ends_on >= date.today())
    elif status_filter == "past":
        statement = statement.where(Trip.ends_on < date.today())
    return db.scalars(statement.order_by(Trip.starts_on)).all()


@router.post("", response_model=TripOut, status_code=status.HTTP_201_CREATED)
def create_trip(payload: TripCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    values = payload.model_dump()
    destination_id = values.get("destination_id")
    if destination_id is not None:
        destination = db.get(Destination, destination_id)
        if destination is None:
            raise HTTPException(status_code=404, detail="Destination not found.")
        if not values["cover_image_url"]:
            values["cover_image_url"] = destination.image_url
    trip = Trip(owner_id=user.id, **values)
    db.add(trip)
    db.flush()
    cursor, number = trip.starts_on, 1
    while cursor <= trip.ends_on:
        db.add(ItineraryDay(trip_id=trip.id, day_number=number, day_date=cursor, title=f"Day {number}"))
        cursor += timedelta(days=1)
        number += 1
    db.commit()
    db.refresh(trip)
    return trip


@router.get("/{trip_id}", response_model=TripDetail)
def get_trip(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _, role = trip_role(db, trip_id, user)
    return detail_payload(load_trip(db, trip_id), role)


@router.patch("/{trip_id}", response_model=TripOut)
def update_trip(trip_id: int, payload: TripUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    trip = require_editor(db, trip_id, user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(trip, key, value)
    if trip.ends_on < trip.starts_on:
        raise HTTPException(status_code=422, detail="The trip end date must be on or after its start date.")
    if (trip.ends_on - trip.starts_on).days >= 90:
        raise HTTPException(status_code=422, detail="A trip can include at most 90 days.")
    duration = (trip.ends_on - trip.starts_on).days + 1
    days = db.scalars(select(ItineraryDay).where(ItineraryDay.trip_id == trip_id).order_by(ItineraryDay.day_number)).all()
    by_number = {day.day_number: day for day in days}
    for day in days:
        if day.day_number > duration:
            db.delete(day)
        else:
            day.day_date = trip.starts_on + timedelta(days=day.day_number - 1)
    for number in range(1, duration + 1):
        if number not in by_number:
            db.add(ItineraryDay(trip_id=trip_id, day_number=number, day_date=trip.starts_on + timedelta(days=number - 1), title=f"Day {number}"))
    trip.updated_at = utcnow()
    db.commit()
    db.refresh(trip)
    return trip


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    trip, role = trip_role(db, trip_id, user)
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the trip owner can delete a trip.")
    db.delete(trip)
    db.commit()


@router.post("/{trip_id}/days", response_model=TripDetail, status_code=status.HTTP_201_CREATED)
def create_day(trip_id: int, payload: DayCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    trip = require_editor(db, trip_id, user)
    if db.scalar(select(ItineraryDay).where(ItineraryDay.trip_id == trip_id, ItineraryDay.day_number == payload.day_number)):
        raise HTTPException(status_code=409, detail="A day with this number already exists.")
    db.add(ItineraryDay(trip_id=trip.id, **payload.model_dump()))
    db.commit()
    return detail_payload(load_trip(db, trip_id), trip_role(db, trip_id, user)[1])


@router.patch("/{trip_id}/days/{day_id}", response_model=TripDetail)
def update_day(trip_id: int, day_id: int, payload: DayUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_editor(db, trip_id, user)
    day = db.get(ItineraryDay, day_id)
    if day is None or day.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Itinerary day not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(day, key, value)
    db.commit()
    return detail_payload(load_trip(db, trip_id), trip_role(db, trip_id, user)[1])


@router.delete("/{trip_id}/days/{day_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_day(trip_id: int, day_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_editor(db, trip_id, user)
    day = db.get(ItineraryDay, day_id)
    if day is None or day.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Itinerary day not found.")
    db.delete(day)
    db.commit()


@router.post("/{trip_id}/days/{day_id}/activities", response_model=TripDetail, status_code=status.HTTP_201_CREATED)
def create_activity(trip_id: int, day_id: int, payload: ActivityCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_editor(db, trip_id, user)
    day = db.get(ItineraryDay, day_id)
    if day is None or day.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Itinerary day not found.")
    db.add(Activity(day_id=day_id, **payload.model_dump()))
    db.commit()
    return detail_payload(load_trip(db, trip_id), trip_role(db, trip_id, user)[1])


@router.patch("/{trip_id}/activities/{activity_id}", response_model=TripDetail)
def update_activity(trip_id: int, activity_id: int, payload: ActivityUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_editor(db, trip_id, user)
    activity = db.get(Activity, activity_id)
    if activity is None or activity.day.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Activity not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(activity, key, value)
    db.commit()
    return detail_payload(load_trip(db, trip_id), trip_role(db, trip_id, user)[1])


@router.delete("/{trip_id}/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(trip_id: int, activity_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_editor(db, trip_id, user)
    activity = db.get(Activity, activity_id)
    if activity is None or activity.day.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Activity not found.")
    db.delete(activity)
    db.commit()


@router.get("/{trip_id}/expenses")
def list_expenses(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    trip_role(db, trip_id, user)
    return db.scalars(select(Expense).where(Expense.trip_id == trip_id).order_by(Expense.spent_on.desc(), Expense.id.desc())).all()


@router.post("/{trip_id}/expenses", status_code=status.HTTP_201_CREATED)
def create_expense(trip_id: int, payload: ExpenseCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_editor(db, trip_id, user)
    expense = Expense(trip_id=trip_id, paid_by_id=user.id, **payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.patch("/{trip_id}/expenses/{expense_id}")
def update_expense(trip_id: int, expense_id: int, payload: ExpenseUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_editor(db, trip_id, user)
    expense = db.get(Expense, expense_id)
    if expense is None or expense.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Expense not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(expense, key, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{trip_id}/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(trip_id: int, expense_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_editor(db, trip_id, user)
    expense = db.get(Expense, expense_id)
    if expense is None or expense.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Expense not found.")
    db.delete(expense)
    db.commit()


@router.get("/{trip_id}/members", response_model=list[MemberOut])
def list_members(trip_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    trip, role = trip_role(db, trip_id, user)
    result = [{
        "id": None, "user_id": trip.owner.id, "email": trip.owner.email, "full_name": trip.owner.full_name,
        "role": "owner", "accepted": True, "invite_url": None,
    }]
    members = db.scalars(select(TripMember).where(TripMember.trip_id == trip_id).order_by(TripMember.created_at)).all()
    result.extend(member_payload(member, request, expose_invite=(role == "owner")) for member in members)
    return result


@router.post("/{trip_id}/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def invite_member(trip_id: int, payload: InviteCreate, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _, role = trip_role(db, trip_id, user)
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the trip owner can invite collaborators.")
    email = payload.email.lower().strip()
    if email == user.email.lower():
        raise HTTPException(status_code=422, detail="You already own this trip.")
    member = db.scalar(select(TripMember).where(TripMember.trip_id == trip_id, TripMember.email == email))
    if member and member.accepted_at is not None:
        raise HTTPException(status_code=409, detail="This person already has access.")
    target = db.scalar(select(User).where(User.email == email))
    if member is None:
        member = TripMember(trip_id=trip_id, email=email, invite_token=make_invite_token())
        db.add(member)
    member.user_id = target.id if target else None
    member.role = payload.role
    member.invite_token = make_invite_token()
    member.accepted_at = None
    db.commit()
    db.refresh(member)
    return member_payload(member, request)


@router.patch("/{trip_id}/members/{member_id}", response_model=MemberOut)
def update_member(trip_id: int, member_id: int, payload: MemberUpdate, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _, role = trip_role(db, trip_id, user)
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the trip owner can change collaborator access.")
    member = db.get(TripMember, member_id)
    if member is None or member.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Collaborator not found.")
    member.role = payload.role
    db.commit()
    db.refresh(member)
    return member_payload(member, request)


@router.delete("/{trip_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(trip_id: int, member_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _, role = trip_role(db, trip_id, user)
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the trip owner can remove collaborators.")
    member = db.get(TripMember, member_id)
    if member is None or member.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Collaborator not found.")
    db.delete(member)
    db.commit()
