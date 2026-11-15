import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCircle2,
  ChevronDown, CircleDollarSign, Clock3, Compass, Copy, Globe2, Heart,
  LayoutDashboard, LogOut, MapPin, Menu, MoreHorizontal, Plus, Search, Settings2, Share2, ShieldCheck,
  Sparkles, Trash2, UserRound, Users, Wallet, X, PlaneTakeoff,
} from "lucide-react";
import { api, setAccessToken } from "./api";
import type { Activity, AuthResult, Destination, Expense, Invitation, ItineraryDay, Member, Trip, TripDetail, User } from "./types";

const fallbackPhoto = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1400&q=85";

function dateLabel(value: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  if (!value) return "";
  return new Date(value + "T12:00:00").toLocaleDateString(undefined, options);
}
function dateRange(start: string, end: string) {
  return dateLabel(start, { month: "short", day: "numeric" }) + " — " + dateLabel(end, { month: "short", day: "numeric", year: "numeric" });
}
function money(value: number | string, currency = "USD") {
  const number = Number(value || 0);
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(number); }
  catch { return "$" + Math.round(number).toLocaleString(); }
}
function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase(); }
function plusDays(date: Date, days: number) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
function inputDate(date: Date) { return date.toISOString().slice(0, 10); }

function AuthScreen({ onAuth }: { onAuth: (result: AuthResult) => void }) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = mode === "register" ? await api.register(name, email, password) : await api.login(email, password);
      onAuth(result);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not sign in."); }
    finally { setBusy(false); }
  }
  return <div className="auth-page">
    <div className="auth-photo" style={{ backgroundImage: "linear-gradient(180deg,rgba(18,31,29,.1),rgba(18,31,29,.72)),url(" + fallbackPhoto + ")" }}>
      <Link to="/" className="brand brand-light"><span className="brand-mark"><Compass size={18} /></span><span>tripforge</span></Link>
      <div className="auth-caption"><span className="eyebrow light">A little more out there</span><h1>Make room<br />for wonder.</h1><p>Good trips start with a feeling. We’ll help you find the rest.</p></div>
      <div className="photo-credit">Lake Braies, South Tyrol · 46°41′ N</div>
    </div>
    <div className="auth-panel"><div className="auth-card">
      <div className="mobile-brand brand"><span className="brand-mark"><Compass size={18} /></span><span>tripforge</span></div>
      <span className="eyebrow">{mode === "register" ? "Your next chapter" : "Welcome back"}</span>
      <h2>{mode === "register" ? "Start planning." : "Pick up where you left off."}</h2>
      <p className="muted">Save the places you dream about, then make a trip of it.</p>
      <form className="form-stack" onSubmit={submit}>
        {mode === "register" && <label>Your name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" autoComplete="name" minLength={2} required /></label>}
        <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 8 : 1} required /></label>
        {error && <div className="form-error">{error}</div>}
        <button className="button button-primary button-wide" disabled={busy}>{busy ? "One moment…" : mode === "register" ? "Create your account" : "Sign in"}<ArrowRight size={16} /></button>
      </form>
      <p className="auth-switch">{mode === "register" ? "Already have an account?" : "New to TripForge?"} <button type="button" className="text-button" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}>{mode === "register" ? "Sign in" : "Create an account"}</button></p>
      <p className="auth-legal">By continuing, you agree to the Terms of Use and Privacy Policy.</p>
    </div></div>
  </div>;
}

function Shell({ user, onLogout, onNewTrip, children }: { user: User; onLogout: () => void; onNewTrip: () => void; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { api.invitations().then(setInvites).catch(() => setInvites([])); }, [location.pathname]);
  async function accept(invite: Invitation) {
    setInviteError("");
    try { await api.acceptInvitation(invite.token); setInvites((all) => all.filter((item) => item.id !== invite.id)); setInviteOpen(false); navigate("/trips/" + invite.trip_id); }
    catch (error) { setInviteError(error instanceof Error ? error.message : "Could not accept invitation."); }
  }
  return <div className="app-shell">
    <aside className={"sidebar " + (mobileOpen ? "sidebar-open" : "")}>
      <Link to="/" className="brand"><span className="brand-mark"><Compass size={18} /></span><span>tripforge</span></Link>
      <div className="sidebar-label">Workspace</div>
      <nav className="side-nav">
        <NavLink to="/" end onClick={() => setMobileOpen(false)}><LayoutDashboard size={17} />Overview</NavLink>
        <NavLink to="/discover" onClick={() => setMobileOpen(false)}><Compass size={17} />Discover</NavLink>
        <NavLink to="/trips" onClick={() => setMobileOpen(false)}><MapPin size={17} />My trips</NavLink>
      </nav>
      <div className="sidebar-discover">
        <div className="side-globe"><Globe2 size={18} /></div><span className="side-mini">A world of possibility</span>
        <p>Somewhere new is closer than you think.</p>
        <Link to="/discover">Find your next place <ArrowRight size={14} /></Link>
      </div>
      <div className="sidebar-bottom">
        <button className={"side-invites " + (inviteOpen ? "active" : "")} onClick={() => setInviteOpen(!inviteOpen)}><Users size={17} />Invitations{invites.length > 0 && <span className="count-badge">{invites.length}</span>}<ChevronDown className="side-chevron" size={15} /></button>
        {inviteOpen && <div className="invite-popover">
          <div className="popover-heading">Trip invitations <button onClick={() => setInviteOpen(false)} aria-label="Close invitations"><X size={15} /></button></div>
          {inviteError && <p className="inline-error">{inviteError}</p>}
          {invites.length === 0 ? <p className="empty-small">No invitations waiting for you.</p> : invites.map((invite) => <div className="invite-item" key={invite.id}>
            <div><b>{invite.trip_title}</b><span>{invite.destination_name} · {invite.role}</span><small>From {invite.invited_by}</small></div>
            <button className="button button-small button-dark" onClick={() => accept(invite)}>Accept</button>
          </div>)}
        </div>}
        <div className="profile-row"><div className="avatar">{initials(user.full_name)}</div><div className="profile-copy"><b>{user.full_name}</b><span>{user.email}</span></div><button className="icon-button" onClick={onLogout} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button></div>
      </div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <button className="icon-button mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu"><Menu size={18} /></button>
        <div className="topbar-note"><span className="live-dot" />Your next adventure is taking shape</div>
        <div className="topbar-actions">
          <button className="icon-button invite-trigger" onClick={() => setInviteOpen(!inviteOpen)} aria-label="View invitations"><Users size={17} />{invites.length > 0 && <span className="notification-dot" />}</button>
          <button className="button button-primary button-compact" onClick={onNewTrip}><Plus size={16} />New trip</button>
        </div>
      </header>
      <main className="page-content">{children}</main>
    </div>
    {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
  </div>;
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}
function ErrorBanner({ message }: { message: string }) { return message ? <div className="error-banner"><span>{message}</span></div> : null; }

function TripCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  return <button className="trip-card" onClick={onClick}>
    <div className="trip-card-photo" style={{ backgroundImage: "url(" + (trip.cover_image_url || fallbackPhoto) + ")" }}>
      <span className="photo-pill"><MapPin size={12} />{trip.destination_name}</span><span className="card-arrow"><ArrowUpRight size={17} /></span>
    </div>
    <div className="trip-card-body"><div className="trip-card-title"><h3>{trip.title}</h3><MoreHorizontal size={17} /></div>
      <span className="trip-card-dates"><CalendarDays size={14} />{dateRange(trip.starts_on, trip.ends_on)}</span>
      <div className="trip-card-footer"><span><Users size={14} />{trip.travelers} {trip.travelers === 1 ? "traveler" : "travelers"}</span><span className="trip-card-budget">{trip.budget ? money(trip.budget, trip.currency) : "No budget yet"}</span></div>
    </div>
  </button>;
}

function DestinationCard({ destination, onPlan }: { destination: Destination; onPlan: () => void }) {
  return <article className="destination-card">
    <div className="destination-photo" style={{ backgroundImage: "url(" + destination.image_url + ")" }}>
      <span className="region-tag">{destination.region}</span><span className="heart-button" aria-hidden="true"><Heart size={17} /></span>
      <span className="rating-pill"><Sparkles size={12} />{destination.rating}</span>
    </div>
    <div className="destination-copy"><div className="destination-title"><div><h3>{destination.name}</h3><span>{destination.country}</span></div><span className="cost-per-day">{money(destination.estimated_daily_cost)}<small>/ day</small></span></div>
      <p>{destination.description}</p><div className="destination-card-bottom"><span>{destination.best_for}</span><button className="plan-link" onClick={onPlan}>Plan a trip <ArrowRight size={14} /></button></div>
    </div>
  </article>;
}

function Dashboard({ user, onCreate }: { user: User; onCreate: (destination?: Destination) => void }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.trips("upcoming"), api.destinations("", "all")]).then(([t, d]) => { setTrips(t); setDestinations(d); }).catch((reason) => setError(reason.message));
  }, []);
  const nextTrip = trips.find((trip) => trip.ends_on >= inputDate(new Date()));
  const spent = trips.reduce((sum, trip) => sum + Number(trip.budget), 0);
  return <div className="dashboard-page">
    <section className="welcome-row"><div><span className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · YOUR TRAVEL DESK</span><h1>Good to see you, {user.full_name.split(" ")[0]}<span className="sun-dot">.</span></h1><p>Ready to turn somewhere into your next story?</p></div><div className="welcome-stamp"><PlaneTakeoff size={19} /><span>Make room<br />for wonder</span></div></section>
    <ErrorBanner message={error} />
    <section className="dashboard-hero">
      <div className="dashboard-hero-copy"><span className="eyebrow light">A softer kind of planning</span><h2>The world is still<br />full of <i>firsts.</i></h2><p>Find a place that makes you feel something. We’ll help with the details.</p><Link to="/discover" className="button button-light">Explore destinations <ArrowRight size={16} /></Link></div>
      <div className="hero-micro-note"><span className="hero-line" />Take the scenic route</div>
      <div className="hero-image-credit">Puglia, Italy · somewhere worth getting lost</div>
    </section>
    <section className="stats-row">
      <div className="stat-card"><span className="stat-icon mint"><MapPin size={17} /></span><div><strong>{trips.length}</strong><span>Trips in the making</span></div><ArrowUpRight size={16} className="stat-arrow" /></div>
      <div className="stat-card"><span className="stat-icon sand"><CalendarDays size={17} /></span><div><strong>{nextTrip ? dateLabel(nextTrip.starts_on) : "Soon?"}</strong><span>{nextTrip ? nextTrip.destination_name + " is next" : "Your next departure"}</span></div><ArrowUpRight size={16} className="stat-arrow" /></div>
      <div className="stat-card"><span className="stat-icon peach"><Wallet size={17} /></span><div><strong>{money(spent)}</strong><span>Planned trip budgets</span></div><ArrowUpRight size={16} className="stat-arrow" /></div>
    </section>
    <section className="section-block">
      <div className="section-title-row"><div><span className="eyebrow">The good stuff</span><h2>Trips on your mind</h2></div><Link to="/trips" className="subtle-link">See all trips <ArrowRight size={14} /></Link></div>
      {trips.length ? <div className="trip-grid">{trips.slice(0, 3).map((trip) => <TripCard key={trip.id} trip={trip} onClick={() => window.location.assign("/trips/" + trip.id)} />)}
        {trips.length < 3 && <button className="add-trip-card" onClick={() => onCreate()}><span className="add-trip-icon"><Plus size={20} /></span><b>There’s room for one more</b><span>Start sketching out your next trip.</span></button>}
      </div> : <div className="empty-state"><div className="empty-icon"><PlaneTakeoff size={23} /></div><h3>Every great trip starts somewhere</h3><p>Make your first plan, then invite your favorite people into it.</p><button className="button button-primary" onClick={() => onCreate()}><Plus size={16} />Create your first trip</button></div>}
    </section>
    <section className="section-block last-section"><div className="section-title-row"><div><span className="eyebrow">A few places to begin</span><h2>Worth the daydream</h2></div><Link to="/discover" className="subtle-link">All destinations <ArrowRight size={14} /></Link></div>
      <div className="destination-grid">{destinations.filter((item) => item.featured).slice(0, 3).map((item) => <DestinationCard key={item.id} destination={item} onPlan={() => onCreate(item)} />)}</div>
    </section>
  </div>;
}

function Discover({ onCreate }: { onCreate: (destination?: Destination) => void }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const timeout = window.setTimeout(() => api.destinations(query, region).then(setDestinations).catch((reason) => setError(reason.message)), 140);
    return () => window.clearTimeout(timeout);
  }, [query, region]);
  const regions = ["all", "Asia", "Europe", "Africa", "Americas"];
  return <div className="discover-page">
    <PageHeading eyebrow="Go where you feel" title="Find your somewhere." subtitle="A few places to get the feeling started. Your trip takes shape from there." action={<span className="result-count"><Compass size={15} />{destinations.length} places</span>} />
    <div className="discover-toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search places, countries, or a feeling…" /><kbd>⌘ K</kbd></div>
      <div className="region-pills">{regions.map((item) => <button key={item} className={"filter-pill " + (region === item ? "selected" : "")} onClick={() => setRegion(item)}>{item === "all" ? "Everywhere" : item}</button>)}</div></div>
    <ErrorBanner message={error} />
    <div className="destination-grid discover-grid">{destinations.map((item) => <DestinationCard key={item.id} destination={item} onPlan={() => onCreate(item)} />)}</div>
    {!destinations.length && !error && <div className="empty-state"><div className="empty-icon"><Search size={22} /></div><h3>No places found just yet</h3><p>Try another search or choose a different part of the world.</p><button className="button button-soft" onClick={() => { setQuery(""); setRegion("all"); }}>Clear search</button></div>}
  </div>;
}

function TripsPage({ onOpen }: { onOpen: (tripId: number) => void }) {
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { api.trips(filter).then(setTrips).catch((reason) => setError(reason.message)); }, [filter]);
  return <div><PageHeading eyebrow="Your travel notebook" title="My trips." subtitle="The plans, the maybes, and the ones you’re already counting down to." action={<span className="result-count"><MapPin size={15} />{trips.length} {trips.length === 1 ? "trip" : "trips"}</span>} />
    <div className="trip-filter-row">{(["all", "upcoming", "past"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={"filter-pill " + (filter === item ? "selected" : "")}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div>
    <ErrorBanner message={error} />
    {trips.length ? <div className="trip-grid trips-grid">{trips.map((trip) => <TripCard key={trip.id} trip={trip} onClick={() => onOpen(trip.id)} />)}</div> :
      <div className="empty-state"><div className="empty-icon"><CalendarDays size={22} /></div><h3>No trips on this page</h3><p>Your next great story is waiting to be planned.</p></div>}
  </div>;
}

function Modal({ title, eyebrow, onClose, children, wide = false }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={"modal-card " + (wide ? "modal-wide" : "")} role="dialog" aria-modal="true" aria-label={title}>
      <button className="modal-close icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{children}
    </section>
  </div>;
}

function TripDialog({ initial, destination, onClose, onSave }: { initial?: Trip; destination?: Destination; onClose: () => void; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  const startDefault = inputDate(plusDays(new Date(), 45));
  const endDefault = inputDate(plusDays(new Date(), 50));
  const [title, setTitle] = useState(initial?.title || (destination ? destination.name + " getaway" : ""));
  const [place, setPlace] = useState(initial?.destination_name || destination?.name || "");
  const [start, setStart] = useState(initial?.starts_on || startDefault);
  const [end, setEnd] = useState(initial?.ends_on || endDefault);
  const [travelers, setTravelers] = useState(initial?.travelers || 2);
  const [budget, setBudget] = useState(initial?.budget || "");
  const [currency, setCurrency] = useState(initial?.currency || "USD");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const existingDestination = destination?.name || initial?.destination_name;
      const sameDestination = existingDestination?.toLowerCase() === place.trim().toLowerCase();
      await onSave({ title, destination_name: place, destination_id: sameDestination ? (initial?.destination_id || destination?.id || null) : null, starts_on: start, ends_on: end, travelers, budget: Number(budget || 0), currency, notes, cover_image_url: sameDestination ? (initial?.cover_image_url || destination?.image_url || "") : "" });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this trip."); }
    finally { setBusy(false); }
  }
  return <Modal title={initial ? "A few trip details" : "Start with the feeling"} eyebrow={initial ? "Edit your trip" : "Make it a real plan"} onClose={onClose} wide>
    <form className="form-stack trip-form" onSubmit={submit}>
      <div className="form-two"><label>Trip name<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A week in the sun" required minLength={2} /></label><label>Going to<input value={place} onChange={(event) => setPlace(event.target.value)} placeholder="Somewhere you’ve been dreaming about" required minLength={2} /></label></div>
      <div className="form-three"><label>Leaving<input type="date" value={start} onChange={(event) => setStart(event.target.value)} required /></label><label>Coming home<input type="date" value={end} min={start} onChange={(event) => setEnd(event.target.value)} required /></label><label>Travelers<input type="number" min={1} max={30} value={travelers} onChange={(event) => setTravelers(Number(event.target.value))} required /></label></div>
      <div className="form-two"><label>Trip budget<input type="number" min={0} step="50" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="A rough total is fine" /></label><label>Currency<select value={currency} onChange={(event) => setCurrency(event.target.value)}><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option><option>CAD</option><option>AUD</option><option>JPY</option></select></label></div>
      <label>Notes <span className="optional-label">optional</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="A little context, the reason for going, or a thing you don’t want to forget." /></label>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions"><button type="button" className="button button-soft" onClick={onClose}>Maybe later</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : initial ? "Save changes" : "Create trip"}<ArrowRight size={16} /></button></div>
    </form>
  </Modal>;
}

function ActivityDialog({ day, initial, onClose, onSave }: { day: ItineraryDay; initial?: Activity; onClose: () => void; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [start, setStart] = useState(initial?.start_time || "09:00");
  const [category, setCategory] = useState(initial?.category || "activity");
  const [cost, setCost] = useState(initial?.cost || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await onSave({ title, location, start_time: start, category, cost: Number(cost || 0), notes }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add this plan."); }
    finally { setBusy(false); }
  }
  return <Modal title={initial ? "Adjust the plan" : "Add a little something"} eyebrow={"Day " + day.day_number + " · " + dateLabel(day.day_date, { weekday: "long", month: "long", day: "numeric" })} onClose={onClose}>
    <form className="form-stack" onSubmit={submit}><label>What are you doing?<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Coffee at the little place" required minLength={2} /></label>
      <div className="form-two"><label>Time<input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>Kind of plan<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="activity">Activity</option><option value="food">Food & drink</option><option value="stay">Stay</option><option value="transport">Getting around</option><option value="note">A note to self</option></select></label></div>
      <label>Where? <span className="optional-label">optional</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Neighbourhood, address, or landmark" /></label>
      <label>Estimated cost <span className="optional-label">optional</span><input type="number" min="0" step="1" value={cost} onChange={(event) => setCost(event.target.value)} placeholder="0" /></label>
      <label>Little details<textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Booking reference, what to order, or a reminder." /></label>
      {error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button-soft" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : initial ? "Save plan" : "Add to itinerary"}<Plus size={16} /></button></div>
    </form>
  </Modal>;
}

function ExpenseDialog({ currency, initial, onClose, onSave }: { currency: string; initial?: Expense; onClose: () => void; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [category, setCategory] = useState(initial?.category || "food");
  const [amount, setAmount] = useState(initial?.amount || "");
  const [spentOn, setSpentOn] = useState(initial?.spent_on || inputDate(new Date()));
  const [notes, setNotes] = useState(initial?.notes || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await onSave({ title, category, amount: Number(amount), spent_on: spentOn, notes }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add this expense."); }
    finally { setBusy(false); }
  }
  return <Modal title={initial ? "Update this expense" : "Keep the numbers honest"} eyebrow={initial ? "Edit expense" : "Add a trip expense"} onClose={onClose}>
    <form className="form-stack" onSubmit={submit}><label>What was it for?<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Dinner by the water" required minLength={2} /></label>
      <div className="form-two"><label>Amount ({currency})<input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="food">Food & drink</option><option value="stay">Stay</option><option value="transport">Transport</option><option value="activity">Activities</option><option value="shopping">Shopping</option><option value="other">Other</option></select></label></div>
      <label>Date<input type="date" value={spentOn} onChange={(event) => setSpentOn(event.target.value)} required /></label><label>Notes <span className="optional-label">optional</span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Any details you’ll want later." /></label>
      {error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button-soft" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : initial ? "Save expense" : "Add expense"}<ArrowRight size={16} /></button></div>
    </form>
  </Modal>;
}

function TripPage() {
  const { id } = useParams();
  const tripId = Number(id);
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tab, setTab] = useState<"itinerary" | "spending" | "travelers">("itinerary");
  const [activityDay, setActivityDay] = useState<ItineraryDay | null>(null);
  const [activityEditing, setActivityEditing] = useState<{ day: ItineraryDay; activity: Activity } | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseEditing, setExpenseEditing] = useState<Expense | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const canEdit = trip?.role === "owner" || trip?.role === "editor";
  const isOwner = trip?.role === "owner";
  async function refresh() {
    try { const [updated, people] = await Promise.all([api.trip(tripId), api.members(tripId)]); setTrip(updated); setMembers(people); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load this trip."); }
  }
  useEffect(() => { refresh(); }, [tripId]);
  async function saveTrip(payload: Record<string, unknown>) { await api.updateTrip(tripId, payload); await refresh(); setEditOpen(false); }
  async function addActivity(day: ItineraryDay, payload: Record<string, unknown>) { const updated = await api.createActivity(tripId, day.id, payload); setTrip(updated); setActivityDay(null); }
  async function saveExpense(payload: Record<string, unknown>) {
    if (expenseEditing) await api.updateExpense(tripId, expenseEditing.id, payload);
    else await api.createExpense(tripId, payload);
    await refresh(); setExpenseOpen(false); setExpenseEditing(null);
  }
  async function addDay() {
    if (!trip) return;
    const newDate = inputDate(plusDays(new Date(trip.ends_on + "T12:00:00"), 1));
    try { await api.updateTrip(tripId, { ends_on: newDate }); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add a day."); }
  }
  async function addInvite(event: FormEvent) {
    event.preventDefault(); setInviteError(""); setInviteSuccess("");
    try { const added = await api.invite(tripId, inviteEmail, inviteRole); setMembers((items) => [...items.filter((person) => person.email !== added.email), added]); setInviteEmail(""); setInviteSuccess(added.accepted ? "They now have access." : "Invite link ready to share."); }
    catch (reason) { setInviteError(reason instanceof Error ? reason.message : "Could not invite this person."); }
  }
  async function copyInvite(member: Member) {
    const token = member.invite_url?.split("/").pop();
    if (!token) return;
    const link = window.location.origin + "/join/" + token;
    try { await navigator.clipboard.writeText(link); setCopyMessage("Link copied"); window.setTimeout(() => setCopyMessage(""), 2200); }
    catch { setCopyMessage(link); }
  }
  async function deleteTrip() {
    if (!window.confirm("Delete “" + trip?.title + "”? This will remove its itinerary and expenses.")) return;
    try { await api.deleteTrip(tripId); navigate("/trips"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete this trip."); }
  }
  async function updateDayTitle(day: ItineraryDay) {
    const title = window.prompt("A name for this day", day.title);
    if (title === null || !title.trim()) return;
    try { const updated = await api.updateDay(tripId, day.id, { title: title.trim() }); setTrip(updated); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not rename this day."); }
  }
  async function toggleActivity(activity: Activity) {
    try { const updated = await api.updateActivity(tripId, activity.id, { completed: !activity.completed }); setTrip(updated); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update this plan."); }
  }
  async function removeActivity(activity: Activity) {
    try { await api.deleteActivity(tripId, activity.id); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not remove this plan."); }
  }
  if (!trip) return <div className="loading-wrap"><div className="spinner" />{error ? <><ErrorBanner message={error} /><Link to="/trips" className="subtle-link"><ArrowLeft size={14} />Back to trips</Link></> : <span>Finding your trip…</span>}</div>;
  const expenses = trip.expenses || [];
  const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const remaining = Math.max(Number(trip.budget) - totalSpent, 0);
  const spentPercent = trip.budget ? Math.min(totalSpent / Number(trip.budget) * 100, 100) : 0;
  const duration = Math.max(1, Math.round((new Date(trip.ends_on + "T12:00:00").getTime() - new Date(trip.starts_on + "T12:00:00").getTime()) / 86400000) + 1);
  return <div className="trip-detail-page">
    <button className="back-link" onClick={() => navigate("/trips")}><ArrowLeft size={15} />All trips</button>
    <section className="trip-cover" style={{ backgroundImage: "linear-gradient(90deg,rgba(17,32,30,.81),rgba(17,32,30,.28)),url(" + (trip.cover_image_url || fallbackPhoto) + ")" }}>
      <div className="trip-cover-top"><span className="trip-cover-place"><MapPin size={14} />{trip.destination_name}</span>{isOwner && <div className="cover-actions"><button className="button button-ghost-light" onClick={() => setEditOpen(true)}><Settings2 size={15} />Edit trip</button><button className="icon-button cover-trash" title="Delete trip" onClick={deleteTrip}><Trash2 size={16} /></button></div>}</div>
      <div className="trip-cover-bottom"><span className="eyebrow light">A trip in progress</span><h1>{trip.title}</h1><div className="cover-meta"><span><CalendarDays size={14} />{dateRange(trip.starts_on, trip.ends_on)}</span><span><Users size={14} />{trip.travelers} travelers</span><span><Clock3 size={14} />{duration} days</span></div></div>
      <div className="cover-decor">TF / {String(trip.id).padStart(3, "0")}</div>
    </section>
    {error && <ErrorBanner message={error} />}
    <div className="trip-overview-strip">
      <div className="overview-item"><span>Trip budget</span><b>{trip.budget ? money(trip.budget, trip.currency) : "Not set"}</b></div>
      <div className="overview-item"><span>So far</span><b>{money(totalSpent, trip.currency)}</b></div>
      <div className="overview-item"><span>Still in the envelope</span><b className={remaining < Number(trip.budget) * .2 ? "text-coral" : ""}>{trip.budget ? money(remaining, trip.currency) : "—"}</b></div>
      <div className="overview-people"><div className="avatar-stack">{members.slice(0, 3).map((member, index) => <span key={member.id || member.email} className={"mini-avatar avatar-tone-" + index}>{initials(member.full_name || member.email)}</span>)}{members.length > 3 && <span className="mini-avatar avatar-more">+{members.length - 3}</span>}</div><span>{members.length} {members.length === 1 ? "person" : "people"}</span></div>
    </div>
    <div className="trip-tabs">{(["itinerary", "spending", "travelers"] as const).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "itinerary" ? <CalendarDays size={16} /> : item === "spending" ? <CircleDollarSign size={16} /> : <Users size={16} />}{item === "itinerary" ? "Itinerary" : item === "spending" ? "Budget & expenses" : "Travelers"}{item === "travelers" && <span className="tab-count">{members.length}</span>}</button>)}</div>
    {tab === "itinerary" && <section className="itinerary-section">
      <div className="section-title-row itinerary-title-row"><div><span className="eyebrow">The days ahead</span><h2>A plan with room to wander</h2></div>{canEdit && <button className="button button-soft" onClick={addDay}><Plus size={15} />Add a day</button>}</div>
      {trip.days.length ? <div className="itinerary-list">{trip.days.map((day) => <article className="day-card" key={day.id}>
        <div className="day-side"><div className="day-num">D{String(day.day_number).padStart(2, "0")}</div><div className="day-line" /><span>{dateLabel(day.day_date, { weekday: "short", month: "short", day: "numeric" })}</span></div>
        <div className="day-main"><div className="day-head"><div><button className="day-title-button" onClick={() => canEdit && updateDayTitle(day)}>{day.title || "Day " + day.day_number}{canEdit && <Settings2 size={13} />}</button><span className="day-count">{day.activities.length ? day.activities.length + " little plans" : "A blank page, for now"}</span></div><div className="day-actions">{canEdit && <button className="small-add" onClick={() => setActivityDay(day)}><Plus size={15} />Add plan</button>}{canEdit && <button className="icon-button tiny-icon" title="Remove day" onClick={async () => { if (!window.confirm("Remove this day and all its plans?")) return; try { await api.deleteDay(tripId, day.id); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not remove this day."); } }}><Trash2 size={14} /></button>}</div></div>
          {day.activities.length > 0 ? <div className="activity-list">{day.activities.map((activity) => <div className={"activity-row " + (activity.completed ? "activity-complete" : "")} key={activity.id}>
            <button className="activity-check" onClick={() => canEdit && toggleActivity(activity)} aria-label={activity.completed ? "Mark incomplete" : "Mark complete"}>{activity.completed && <Check size={12} />}</button>
            <div className="activity-time">{activity.start_time}</div><div className="activity-marker"><span className={"category-dot category-" + activity.category} /></div>
            <div className="activity-content"><b>{activity.title}</b>{activity.location && <span><MapPin size={12} />{activity.location}</span>}{activity.notes && <small>{activity.notes}</small>}</div>
            <span className="activity-category">{activity.category}</span>{Number(activity.cost) > 0 && <span className="activity-cost">{money(activity.cost, trip.currency)}</span>}
            {canEdit && <button className="icon-button tiny-icon" onClick={() => setActivityEditing({ day, activity })} title="Edit plan"><Settings2 size={14} /></button>}
            {canEdit && <button className="icon-button tiny-icon" onClick={() => removeActivity(activity)} title="Remove plan"><Trash2 size={14} /></button>}
          </div>)}</div> : <button className="day-empty" onClick={() => canEdit && setActivityDay(day)}><span className="day-empty-icon"><Plus size={16} /></span><span>Add a café, a walk, a reservation…</span><ArrowRight size={14} /></button>}
          {day.notes && <p className="day-note">{day.notes}</p>}
        </div>
      </article>)}</div> : <div className="empty-state compact-empty"><div className="empty-icon"><CalendarDays size={20} /></div><h3>This trip needs a day or two</h3><p>Add dates to your itinerary, then fill in the plans you don’t want to forget.</p>{canEdit && <button className="button button-primary" onClick={addDay}><Plus size={15} />Add a day</button>}</div>}
      <div className="itinerary-footnote"><Sparkles size={15} /><span>The best plans leave a little space for the unexpected.</span></div>
    </section>}
    {tab === "spending" && <section className="spending-section">
      <div className="section-title-row"><div><span className="eyebrow">The money part</span><h2>A budget that breathes</h2></div>{canEdit && <button className="button button-primary" onClick={() => setExpenseOpen(true)}><Plus size={15} />Add expense</button>}</div>
      <div className="budget-layout"><div className="budget-card">
        <div className="budget-card-top"><span className="budget-icon"><Wallet size={18} /></span><span className="budget-label">Trip budget</span><button className="budget-edit" onClick={() => setEditOpen(true)} disabled={!canEdit}>Edit <ArrowUpRight size={13} /></button></div>
        <strong>{trip.budget ? money(trip.budget, trip.currency) : "Set a budget"}</strong><div className="budget-meter"><span style={{ width: spentPercent + "%" }} /></div>
        <div className="budget-meter-labels"><span>{Math.round(spentPercent)}% used</span><span>{trip.budget ? money(remaining, trip.currency) + " left" : "Add a budget to see progress"}</span></div>
        <div className="budget-summary"><div><span>Spent</span><b>{money(totalSpent, trip.currency)}</b></div><div><span>Expenses</span><b>{expenses.length}</b></div><div><span>Per traveler</span><b>{money(trip.travelers ? Number(trip.budget) / trip.travelers : 0, trip.currency)}</b></div></div>
      </div><div className="budget-note-card"><div className="note-spark"><Sparkles size={17} /></div><span className="eyebrow">A little reminder</span><h3>Spend on what<br />you’ll remember.</h3><p>The view from the train. The meal you talked about all week. You know the ones.</p><span className="note-signature">— The TripForge way</span></div></div>
      <div className="section-title-row expense-heading"><div><span className="eyebrow">The running list</span><h2>Expenses <span className="muted-count">{expenses.length}</span></h2></div><span className="expense-total">{money(totalSpent, trip.currency)} total</span></div>
      {expenses.length ? <div className="expense-list">{expenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} currency={trip.currency} canEdit={Boolean(canEdit)} onEdit={() => setExpenseEditing(expense)} onDelete={async () => { await api.deleteExpense(tripId, expense.id); await refresh(); }} onError={setError} />)}</div> : <div className="expense-empty"><span className="empty-icon"><CircleDollarSign size={21} /></span><div><b>No expenses yet</b><p>Log bookings, meals, and everything in between.</p></div>{canEdit && <button className="button button-soft" onClick={() => setExpenseOpen(true)}><Plus size={15} />Add first expense</button>}</div>}
    </section>}
    {tab === "travelers" && <section className="travelers-section">
      <div className="section-title-row"><div><span className="eyebrow">Better together</span><h2>Your travel crew</h2><p>Invite people in and choose what they can do.</p></div></div>
      {isOwner && <form className="invite-form" onSubmit={addInvite}><div className="invite-form-icon"><Share2 size={18} /></div><div className="invite-form-copy"><b>Bring someone along</b><span>They’ll get a secure link to join the trip.</span></div><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="friend@example.com" required /><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "editor" | "viewer")}><option value="viewer">Can view</option><option value="editor">Can edit</option></select><button className="button button-primary"><Plus size={15} />Invite</button></form>}
      {inviteError && <div className="form-error inline-form-error">{inviteError}</div>}{inviteSuccess && <div className="form-success"><CheckCircle2 size={15} />{inviteSuccess}</div>}
      <div className="member-list">{members.map((member, index) => <div className="member-row" key={member.id || member.email}><span className={"member-avatar avatar-tone-" + index}>{initials(member.full_name || member.email)}</span><div className="member-details"><b>{member.full_name || member.email}</b><span>{member.email}{!member.accepted && <i> · invitation pending</i>}</span></div><span className={"role-badge role-" + member.role}>{member.role === "owner" ? <ShieldCheck size={13} /> : member.role === "editor" ? <Settings2 size={13} /> : <UserRound size={13} />}{member.role}</span>
        {!member.accepted && member.invite_url && <button className="button button-small button-soft" onClick={() => copyInvite(member)}><Copy size={14} />{copyMessage === "Link copied" ? "Copied" : "Copy invite"}</button>}
        {isOwner && member.role !== "owner" && member.id && <select className="role-select" value={member.role} onChange={async (event) => { try { const updated = await api.updateMember(tripId, member.id!, event.target.value as "editor" | "viewer"); setMembers((all) => all.map((item) => item.id === updated.id ? updated : item)); } catch (reason) { setInviteError(reason instanceof Error ? reason.message : "Could not change access."); } }} aria-label={"Access for " + member.email}><option value="viewer">Viewer</option><option value="editor">Editor</option></select>}
        {isOwner && member.role !== "owner" && member.id && <button className="icon-button tiny-icon" title="Remove access" onClick={async () => { try { await api.removeMember(tripId, member.id!); setMembers((all) => all.filter((item) => item.id !== member.id)); } catch (reason) { setInviteError(reason instanceof Error ? reason.message : "Could not remove access."); } }}><Trash2 size={15} /></button>}
      </div>)}</div>
      <div className="permissions-note"><ShieldCheck size={18} /><div><b>Access stays in your hands</b><p>Viewers can see plans and expenses. Editors can update the itinerary. Only you can change access or remove the trip.</p></div></div>
    </section>}
    {activityDay && <ActivityDialog day={activityDay} onClose={() => setActivityDay(null)} onSave={(payload) => addActivity(activityDay, payload)} />}
    {activityEditing && <ActivityDialog day={activityEditing.day} initial={activityEditing.activity} onClose={() => setActivityEditing(null)} onSave={async (payload) => { const updated = await api.updateActivity(tripId, activityEditing.activity.id, payload); setTrip(updated); setActivityEditing(null); }} />}
    {(expenseOpen || expenseEditing) && <ExpenseDialog currency={trip.currency} initial={expenseEditing || undefined} onClose={() => { setExpenseOpen(false); setExpenseEditing(null); }} onSave={saveExpense} />}
    {editOpen && <TripDialog initial={trip} onClose={() => setEditOpen(false)} onSave={saveTrip} />}
  </div>;
}

function ExpenseRow({ expense, currency, canEdit, onEdit, onDelete, onError }: { expense: Expense; currency: string; canEdit: boolean; onEdit: () => void; onDelete: () => Promise<void>; onError: (message: string) => void }) {
  const icons: Record<string, ReactNode> = { food: <span>✳</span>, stay: <span>⌂</span>, transport: <span>↗</span>, activity: <Sparkles size={16} />, shopping: <Heart size={16} />, other: <CircleDollarSign size={16} /> };
  const tone = "expense-tone-" + (["food", "stay", "transport", "activity", "shopping"].includes(expense.category) ? expense.category : "other");
  return <div className="expense-row"><span className={"expense-icon " + tone}>{icons[expense.category] || icons.other}</span><div className="expense-copy"><b>{expense.title}</b><span>{dateLabel(expense.spent_on, { month: "short", day: "numeric", year: "numeric" })} · {expense.category}</span></div><span className="expense-paid">{expense.paid_by?.full_name ? "Paid by " + expense.paid_by.full_name.split(" ")[0] : ""}</span><strong>{money(expense.amount, currency)}</strong>{canEdit && <><button className="icon-button tiny-icon" onClick={onEdit} title="Edit expense"><Settings2 size={14} /></button><button className="icon-button tiny-icon" onClick={() => onDelete().catch((reason) => onError(reason instanceof Error ? reason.message : "Could not delete expense."))} title="Delete expense"><Trash2 size={15} /></button></>}</div>;
}

function JoinPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Checking your invitation…");
  useEffect(() => {
    if (!token) return;
    api.acceptInvitation(token).then((result) => { setMessage("You’re in. Your trip is ready."); window.setTimeout(() => navigate("/trips/" + result.trip_id), 700); })
      .catch((reason) => setMessage(reason instanceof Error ? reason.message : "This invite is no longer available."));
  }, [token]);
  return <div className="join-card"><span className="join-icon"><Users size={22} /></span><span className="eyebrow">Travel is better together</span><h2>{message}</h2><p>If you just created your account, refresh this page to accept the invitation.</p><Link to="/trips" className="button button-soft">Go to my trips <ArrowRight size={15} /></Link></div>;
}

function AppRoutes({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [dialog, setDialog] = useState<{ open: boolean; destination?: Destination }>({ open: false });
  const navigate = useNavigate();
  function openDialog(destination?: Destination) { setDialog({ open: true, destination }); }
  async function createTrip(payload: Record<string, unknown>) {
    const trip = await api.createTrip(payload);
    setDialog({ open: false });
    navigate("/trips/" + trip.id);
  }
  return <Shell user={user} onLogout={onLogout} onNewTrip={() => openDialog()}>
    <Routes>
      <Route path="/" element={<Dashboard user={user} onCreate={openDialog} />} />
      <Route path="/discover" element={<Discover onCreate={openDialog} />} />
      <Route path="/trips" element={<TripsPage onOpen={(tripId) => navigate("/trips/" + tripId)} />} />
      <Route path="/trips/:id" element={<TripPage />} />
      <Route path="/join/:token" element={<JoinPage />} />
      <Route path="*" element={<div className="not-found"><span className="eyebrow">Wrong turn</span><h1>This page wandered off.</h1><Link className="button button-primary" to="/">Back to your desk <ArrowRight size={15} /></Link></div>} />
    </Routes>
    {dialog.open && <TripDialog destination={dialog.destination} onClose={() => setDialog({ open: false })} onSave={createTrip} />}
  </Shell>;
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("tripforge_token"));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  useEffect(() => {
    if (!token) { setUser(null); setLoading(false); return; }
    setAccessToken(token);
    api.me().then(setUser).catch(() => { setAccessToken(null); setToken(null); setUser(null); }).finally(() => setLoading(false));
  }, [token]);
  function onAuth(result: AuthResult) { setAccessToken(result.access_token); setToken(result.access_token); setUser(result.user); }
  function logout() { setAccessToken(null); setToken(null); setUser(null); }
  if (loading) return <div className="boot-screen"><span className="brand-mark"><Compass size={19} /></span><span className="spinner" /><span>Getting your travel desk ready…</span></div>;
  if (!user) return <AuthScreen onAuth={onAuth} />;
  return <AppRoutes user={user} onLogout={logout} />;
}
