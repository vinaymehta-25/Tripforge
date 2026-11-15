export type User = { id: number; email: string; full_name: string };
export type AuthResult = { access_token: string; token_type: string; user: User };
export type Destination = {
  id: number; name: string; country: string; region: string; description: string;
  image_url: string; best_for: string; estimated_daily_cost: string; rating: string; featured: boolean;
};
export type Activity = {
  id: number; title: string; location: string; start_time: string; duration_minutes: number;
  category: string; cost: string; notes: string; completed: boolean;
};
export type ItineraryDay = { id: number; day_number: number; day_date: string; title: string; notes: string; activities: Activity[] };
export type Expense = {
  id: number; title: string; category: string; amount: string; spent_on: string;
  notes: string; paid_by_id: number | null; paid_by?: User | null;
};
export type Trip = {
  id: number; title: string; destination_id: number | null; destination_name: string;
  starts_on: string; ends_on: string; travelers: number; budget: string; currency: string;
  notes: string; cover_image_url: string; owner_id: number; created_at: string; updated_at: string;
};
export type TripDetail = Trip & { days: ItineraryDay[]; expenses: Expense[]; role: "owner" | "editor" | "viewer" };
export type Member = {
  id: number | null; user_id: number | null; email: string; full_name: string | null;
  role: "owner" | "editor" | "viewer"; accepted: boolean; invite_url: string | null;
};
export type Invitation = { id: number; trip_id: number; trip_title: string; destination_name: string; role: string; token: string; invited_by: string };
