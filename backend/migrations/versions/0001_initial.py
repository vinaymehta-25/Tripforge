"""Initial TripForge schema."""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table("destinations",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(120), nullable=False),
        sa.Column("country", sa.String(120), nullable=False), sa.Column("region", sa.String(80), nullable=False),
        sa.Column("description", sa.Text(), nullable=False), sa.Column("image_url", sa.String(500), nullable=False),
        sa.Column("best_for", sa.String(160), nullable=False), sa.Column("estimated_daily_cost", sa.Numeric(10, 2), nullable=False),
        sa.Column("rating", sa.Numeric(2, 1), nullable=False), sa.Column("featured", sa.Boolean(), nullable=False))
    op.create_index("ix_destinations_name", "destinations", ["name"])
    op.create_index("ix_destinations_country", "destinations", ["country"])
    op.create_index("ix_destinations_region", "destinations", ["region"])
    op.create_table("trips",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("destination_id", sa.Integer(), sa.ForeignKey("destinations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(160), nullable=False), sa.Column("destination_name", sa.String(160), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False), sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("travelers", sa.Integer(), nullable=False), sa.Column("budget", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False), sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("cover_image_url", sa.String(500), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("travelers >= 1", name="ck_trip_travelers_positive"),
        sa.CheckConstraint("budget >= 0", name="ck_trip_budget_nonnegative"),
        sa.CheckConstraint("ends_on >= starts_on", name="ck_trip_dates_ordered"))
    op.create_index("ix_trips_owner_id", "trips", ["owner_id"])
    op.create_table("trip_members",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("trip_id", sa.Integer(), sa.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("email", sa.String(320), nullable=False), sa.Column("role", sa.String(12), nullable=False),
        sa.Column("invite_token", sa.String(64), nullable=False), sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("trip_id", "email", name="uq_trip_member_email"),
        sa.UniqueConstraint("invite_token", name="uq_trip_members_invite_token"),
        sa.CheckConstraint("role IN ('editor', 'viewer')", name="ck_member_role"))
    op.create_index("ix_trip_members_trip_id", "trip_members", ["trip_id"])
    op.create_index("ix_trip_members_user_id", "trip_members", ["user_id"])
    op.create_index("ix_trip_members_email", "trip_members", ["email"])
    op.create_table("itinerary_days",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("trip_id", sa.Integer(), sa.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day_number", sa.Integer(), nullable=False), sa.Column("day_date", sa.Date(), nullable=False),
        sa.Column("title", sa.String(160), nullable=False), sa.Column("notes", sa.Text(), nullable=False),
        sa.UniqueConstraint("trip_id", "day_number", name="uq_itinerary_trip_day"),
        sa.CheckConstraint("day_number >= 1", name="ck_itinerary_day_positive"))
    op.create_index("ix_itinerary_days_trip_id", "itinerary_days", ["trip_id"])
    op.create_table("activities",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("day_id", sa.Integer(), sa.ForeignKey("itinerary_days.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(160), nullable=False), sa.Column("location", sa.String(200), nullable=False),
        sa.Column("start_time", sa.String(5), nullable=False), sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(32), nullable=False), sa.Column("cost", sa.Numeric(10, 2), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False), sa.Column("completed", sa.Boolean(), nullable=False))
    op.create_index("ix_activities_day_id", "activities", ["day_id"])
    op.create_table("expenses",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("trip_id", sa.Integer(), sa.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False),
        sa.Column("paid_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(160), nullable=False), sa.Column("category", sa.String(32), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False), sa.Column("spent_on", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("amount >= 0", name="ck_expense_amount_nonnegative"))
    op.create_index("ix_expenses_trip_id", "expenses", ["trip_id"])


def downgrade() -> None:
    op.drop_table("expenses")
    op.drop_index("ix_activities_day_id", table_name="activities")
    op.drop_table("activities")
    op.drop_index("ix_itinerary_days_trip_id", table_name="itinerary_days")
    op.drop_table("itinerary_days")
    op.drop_index("ix_trip_members_email", table_name="trip_members")
    op.drop_index("ix_trip_members_user_id", table_name="trip_members")
    op.drop_index("ix_trip_members_trip_id", table_name="trip_members")
    op.drop_table("trip_members")
    op.drop_index("ix_trips_owner_id", table_name="trips")
    op.drop_table("trips")
    op.drop_index("ix_destinations_region", table_name="destinations")
    op.drop_index("ix_destinations_country", table_name="destinations")
    op.drop_index("ix_destinations_name", table_name="destinations")
    op.drop_table("destinations")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
