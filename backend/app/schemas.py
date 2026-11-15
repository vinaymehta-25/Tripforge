from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserOut(ORMModel):
    id: int
    email: EmailStr
    full_name: str


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class DestinationOut(ORMModel):
    id: int
    name: str
    country: str
    region: str
    description: str
    image_url: str
    best_for: str
    estimated_daily_cost: Decimal
    rating: Decimal
    featured: bool


class TripCreate(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    destination_id: int | None = None
    destination_name: str = Field(min_length=2, max_length=160)
    starts_on: date
    ends_on: date
    travelers: int = Field(default=1, ge=1, le=30)
    budget: Decimal = Field(default=0, ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    notes: str = Field(default="", max_length=10000)
    cover_image_url: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def dates_are_ordered(self):
        if self.ends_on < self.starts_on:
            raise ValueError("The trip end date must be on or after its start date.")
        if (self.ends_on - self.starts_on).days >= 90:
            raise ValueError("A trip can include at most 90 days.")
        return self


class TripUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    destination_id: int | None = None
    destination_name: str | None = Field(default=None, min_length=2, max_length=160)
    starts_on: date | None = None
    ends_on: date | None = None
    travelers: int | None = Field(default=None, ge=1, le=30)
    budget: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    notes: str | None = Field(default=None, max_length=10000)
    cover_image_url: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def dates_are_ordered(self):
        if self.starts_on and self.ends_on and self.ends_on < self.starts_on:
            raise ValueError("The trip end date must be on or after its start date.")
        return self


class ActivityOut(ORMModel):
    id: int
    title: str
    location: str
    start_time: str
    duration_minutes: int
    category: str
    cost: Decimal
    notes: str
    completed: bool


class DayOut(ORMModel):
    id: int
    day_number: int
    day_date: date
    title: str
    notes: str
    activities: list[ActivityOut] = []


class ExpenseOut(ORMModel):
    id: int
    title: str
    category: str
    amount: Decimal
    spent_on: date
    notes: str
    paid_by_id: int | None
    paid_by: UserOut | None = None


class MemberOut(BaseModel):
    id: int | None = None
    user_id: int | None = None
    email: EmailStr
    full_name: str | None = None
    role: Literal["owner", "editor", "viewer"]
    accepted: bool = True
    invite_url: str | None = None


class TripOut(ORMModel):
    id: int
    title: str
    destination_id: int | None
    destination_name: str
    starts_on: date
    ends_on: date
    travelers: int
    budget: Decimal
    currency: str
    notes: str
    cover_image_url: str
    owner_id: int
    created_at: datetime
    updated_at: datetime


class TripDetail(TripOut):
    days: list[DayOut] = []
    expenses: list[ExpenseOut] = []
    role: Literal["owner", "editor", "viewer"]


class DayCreate(BaseModel):
    day_number: int = Field(ge=1, le=90)
    day_date: date
    title: str = Field(default="", max_length=160)
    notes: str = Field(default="", max_length=10000)


class DayUpdate(BaseModel):
    day_number: int | None = Field(default=None, ge=1, le=90)
    day_date: date | None = None
    title: str | None = Field(default=None, max_length=160)
    notes: str | None = Field(default=None, max_length=10000)


class ActivityCreate(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    location: str = Field(default="", max_length=200)
    start_time: str = Field(default="09:00", pattern=r"^\d{2}:\d{2}$")
    duration_minutes: int = Field(default=60, ge=5, le=1440)
    category: str = Field(default="activity", max_length=32)
    cost: Decimal = Field(default=0, ge=0)
    notes: str = Field(default="", max_length=5000)


class ActivityUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    location: str | None = Field(default=None, max_length=200)
    start_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    duration_minutes: int | None = Field(default=None, ge=5, le=1440)
    category: str | None = Field(default=None, max_length=32)
    cost: Decimal | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=5000)
    completed: bool | None = None


class ExpenseCreate(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    category: str = Field(default="other", max_length=32)
    amount: Decimal = Field(ge=0)
    spent_on: date
    notes: str = Field(default="", max_length=5000)


class ExpenseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    category: str | None = Field(default=None, max_length=32)
    amount: Decimal | None = Field(default=None, ge=0)
    spent_on: date | None = None
    notes: str | None = Field(default=None, max_length=5000)


class InviteCreate(BaseModel):
    email: EmailStr
    role: Literal["editor", "viewer"] = "viewer"


class MemberUpdate(BaseModel):
    role: Literal["editor", "viewer"]


class AcceptInvite(BaseModel):
    token: str = Field(min_length=32, max_length=64)
