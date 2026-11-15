import type { AuthResult, Destination, Expense, Invitation, Member, Trip, TripDetail, User } from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
let accessToken = localStorage.getItem("tripforge_token");

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem("tripforge_token", token);
  else localStorage.removeItem("tripforge_token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", "Bearer " + accessToken);
  const response = await fetch(API_BASE + path, { ...init, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const detail = data?.detail;
    const message = Array.isArray(detail) ? detail.map((item: { msg?: string }) => item.msg).join(" ") : detail;
    throw new Error(message || "Something went wrong. Please try again.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const json = (value: unknown) => JSON.stringify(value);

export const api = {
  login: (email: string, password: string) => request<AuthResult>("/auth/login", { method: "POST", body: json({ email, password }) }),
  register: (full_name: string, email: string, password: string) => request<AuthResult>("/auth/register", { method: "POST", body: json({ full_name, email, password }) }),
  me: () => request<User>("/auth/me"),
  invitations: () => request<Invitation[]>("/auth/invitations"),
  acceptInvitation: (token: string) => request<{ ok: boolean; trip_id: number }>("/auth/invitations/accept", { method: "POST", body: json({ token }) }),
  destinations: (q = "", region = "all") => request<Destination[]>("/destinations?q=" + encodeURIComponent(q) + "&region=" + encodeURIComponent(region)),
  trips: (status = "all") => request<Trip[]>("/trips?status=" + status),
  trip: (id: number) => request<TripDetail>("/trips/" + id),
  createTrip: (payload: unknown) => request<Trip>("/trips", { method: "POST", body: json(payload) }),
  updateTrip: (id: number, payload: unknown) => request<Trip>("/trips/" + id, { method: "PATCH", body: json(payload) }),
  deleteTrip: (id: number) => request<void>("/trips/" + id, { method: "DELETE" }),
  createDay: (tripId: number, payload: unknown) => request<TripDetail>("/trips/" + tripId + "/days", { method: "POST", body: json(payload) }),
  updateDay: (tripId: number, dayId: number, payload: unknown) => request<TripDetail>("/trips/" + tripId + "/days/" + dayId, { method: "PATCH", body: json(payload) }),
  deleteDay: (tripId: number, dayId: number) => request<void>("/trips/" + tripId + "/days/" + dayId, { method: "DELETE" }),
  createActivity: (tripId: number, dayId: number, payload: unknown) => request<TripDetail>("/trips/" + tripId + "/days/" + dayId + "/activities", { method: "POST", body: json(payload) }),
  updateActivity: (tripId: number, activityId: number, payload: unknown) => request<TripDetail>("/trips/" + tripId + "/activities/" + activityId, { method: "PATCH", body: json(payload) }),
  deleteActivity: (tripId: number, activityId: number) => request<void>("/trips/" + tripId + "/activities/" + activityId, { method: "DELETE" }),
  createExpense: (tripId: number, payload: unknown) => request<Expense>("/trips/" + tripId + "/expenses", { method: "POST", body: json(payload) }),
  updateExpense: (tripId: number, expenseId: number, payload: unknown) => request<Expense>("/trips/" + tripId + "/expenses/" + expenseId, { method: "PATCH", body: json(payload) }),
  deleteExpense: (tripId: number, expenseId: number) => request<void>("/trips/" + tripId + "/expenses/" + expenseId, { method: "DELETE" }),
  members: (tripId: number) => request<Member[]>("/trips/" + tripId + "/members"),
  invite: (tripId: number, email: string, role: "editor" | "viewer") => request<Member>("/trips/" + tripId + "/members", { method: "POST", body: json({ email, role }) }),
  updateMember: (tripId: number, memberId: number, role: "editor" | "viewer") => request<Member>("/trips/" + tripId + "/members/" + memberId, { method: "PATCH", body: json({ role }) }),
  removeMember: (tripId: number, memberId: number) => request<void>("/trips/" + tripId + "/members/" + memberId, { method: "DELETE" }),
};
