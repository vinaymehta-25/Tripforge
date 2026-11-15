from datetime import date, datetime, timezone
from decimal import Decimal
from enum import StrEnum
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class MemberRole(StrEnum):
    editor = "editor"
    viewer = "viewer"


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    owned_trips: Mapped[list["Trip"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    memberships: Mapped[list["TripMember"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Destination(Base):
    __tablename__ = "destinations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    country: Mapped[str] = mapped_column(String(120), index=True)
    region: Mapped[str] = mapped_column(String(80), index=True)
    description: Mapped[str] = mapped_column(Text)
    image_url: Mapped[str] = mapped_column(String(500))
    best_for: Mapped[str] = mapped_column(String(160))
    estimated_daily_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=120)
    rating: Mapped[Decimal] = mapped_column(Numeric(2, 1), default=4.8)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)


class Trip(Base):
    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint("travelers >= 1", name="ck_trip_travelers_positive"),
        CheckConstraint("budget >= 0", name="ck_trip_budget_nonnegative"),
        CheckConstraint("ends_on >= starts_on", name="ck_trip_dates_ordered"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    destination_id: Mapped[int | None] = mapped_column(ForeignKey("destinations.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(160))
    destination_name: Mapped[str] = mapped_column(String(160))
    starts_on: Mapped[date] = mapped_column(Date)
    ends_on: Mapped[date] = mapped_column(Date)
    travelers: Mapped[int] = mapped_column(Integer, default=1)
    budget: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    notes: Mapped[str] = mapped_column(Text, default="")
    cover_image_url: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    owner: Mapped[User] = relationship(back_populates="owned_trips")
    destination: Mapped[Destination | None] = relationship()
    days: Mapped[list["ItineraryDay"]] = relationship(back_populates="trip", cascade="all, delete-orphan", order_by="ItineraryDay.day_number")
    expenses: Mapped[list["Expense"]] = relationship(back_populates="trip", cascade="all, delete-orphan")
    members: Mapped[list["TripMember"]] = relationship(back_populates="trip", cascade="all, delete-orphan")


class TripMember(Base):
    __tablename__ = "trip_members"
    __table_args__ = (
        UniqueConstraint("trip_id", "email", name="uq_trip_member_email"),
        CheckConstraint("role IN ('editor', 'viewer')", name="ck_member_role"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    role: Mapped[str] = mapped_column(String(12), default=MemberRole.viewer.value)
    invite_token: Mapped[str] = mapped_column(String(64), unique=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    trip: Mapped[Trip] = relationship(back_populates="members")
    user: Mapped[User | None] = relationship(back_populates="memberships")


class ItineraryDay(Base):
    __tablename__ = "itinerary_days"
    __table_args__ = (
        UniqueConstraint("trip_id", "day_number", name="uq_itinerary_trip_day"),
        CheckConstraint("day_number >= 1", name="ck_itinerary_day_positive"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), index=True)
    day_number: Mapped[int] = mapped_column(Integer)
    day_date: Mapped[date] = mapped_column(Date)
    title: Mapped[str] = mapped_column(String(160), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    trip: Mapped[Trip] = relationship(back_populates="days")
    activities: Mapped[list["Activity"]] = relationship(back_populates="day", cascade="all, delete-orphan", order_by="Activity.start_time")


class Activity(Base):
    __tablename__ = "activities"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    day_id: Mapped[int] = mapped_column(ForeignKey("itinerary_days.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    location: Mapped[str] = mapped_column(String(200), default="")
    start_time: Mapped[str] = mapped_column(String(5), default="09:00")
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    category: Mapped[str] = mapped_column(String(32), default="activity")
    cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    notes: Mapped[str] = mapped_column(Text, default="")
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    day: Mapped[ItineraryDay] = relationship(back_populates="activities")


class Expense(Base):
    __tablename__ = "expenses"
    __table_args__ = (CheckConstraint("amount >= 0", name="ck_expense_amount_nonnegative"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), index=True)
    paid_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(32), default="other")
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    spent_on: Mapped[date] = mapped_column(Date)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    trip: Mapped[Trip] = relationship(back_populates="expenses")
    paid_by: Mapped[User | None] = relationship()
