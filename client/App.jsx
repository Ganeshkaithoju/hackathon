import "./global.css";
import React, { useEffect, useMemo, useState, Fragment } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate,
  useLocation,
} from "react-router-dom";

// ---------- Utilities: runtime data + persistence ----------
const readVar = (name, fallback) => {
  try {
    if (typeof window !== "undefined" && window[name] != null) return structuredClone(window[name]);
    const raw = localStorage.getItem(name);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("readVar error", name, e);
  }
  return structuredClone(fallback);
};
const writeVar = (name, value) => {
  try {
    if (typeof window !== "undefined") window[name] = value;
    localStorage.setItem(name, JSON.stringify(value));
  } catch (e) {
    console.error("writeVar error", name, e);
  }
};

// Demo defaults (overridden by runtime window.<var>)
const defaultUsers = [
  { id: "u_1", role: "user", name: "Ava Stone", email: "ava@example.com", password: "password" },
  { id: "u_2", role: "user", name: "Liam Park", email: "liam@example.com", password: "password" },
  { id: "a_1", role: "admin", name: "Admin One", email: "admin@example.com", password: "admin" },
];
const defaultPlans = [
  { id: "basic", name: "Basic", price: 9, interval: "mo", description: "For individuals just getting started", features: ["1 project", "Email support"], popular: false },
  { id: "pro", name: "Pro", price: 29, interval: "mo", description: "For growing teams that need more", features: ["10 projects", "Priority support", "Team seats"], popular: true },
  { id: "business", name: "Business", price: 79, interval: "mo", description: "For businesses with scale needs", features: ["Unlimited projects", "SLA support", "SSO"], popular: false },
];
const defaultSubs = [
  { id: "s_1", userId: "u_1", planId: "pro", status: "active", startDate: "2024-05-01", renewDate: "2025-05-01" },
  { id: "s_2", userId: "u_2", planId: "basic", status: "active", startDate: "2024-08-20", renewDate: "2025-08-20" },
];
const defaultLogs = [
  { id: "l_1", subscriptionId: "s_1", userId: "u_1", action: "created", date: "2024-05-01" },
  { id: "l_2", subscriptionId: "s_1", userId: "u_1", action: "renewed", date: "2024-11-01" },
  { id: "l_3", subscriptionId: "s_2", userId: "u_2", action: "created", date: "2024-08-20" },
];
const defaultBilling = [
  { id: "b_1", userId: "u_1", amount: 29, currency: "USD", date: "2024-11-01", status: "paid", description: "Pro monthly renewal" },
  { id: "b_2", userId: "u_2", amount: 9, currency: "USD", date: "2024-09-20", status: "paid", description: "Basic monthly renewal" },
];

// Data context
const DataContext = React.createContext(null);
const useData = () => React.useContext(DataContext);

// Auth context
const AuthContext = React.createContext(null);
const useAuth = () => React.useContext(AuthContext);

// Confirm modal
function ConfirmModal({ open, title, message, confirmText = "Confirm", cancelText = "Cancel", onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-md rounded-2xl bg-card text-card-foreground shadow-xl ring-1 ring-black/5">
        <div className="p-6">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition">{cancelText}</button>
            <button onClick={() => { onConfirm?.(); onClose?.(); }} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition">{confirmText}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function useConfirm() {
  const [state, setState] = useState({ open: false, title: "", message: "" });
  const resolverRef = React.useRef(null);
  const confirm = (title, message) => new Promise((resolve) => {
    resolverRef.current = resolve;
    setState({ open: true, title, message });
  });
  const onClose = () => {
    setState((s) => ({ ...s, open: false }));
    if (resolverRef.current) resolverRef.current(false);
  };
  const onConfirm = () => {
    setState((s) => ({ ...s, open: false }));
    if (resolverRef.current) resolverRef.current(true);
  };
  const modal = (
    <ConfirmModal
      open={state.open}
      title={state.title}
      message={state.message}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
  return { confirm, modal };
}

// ---------- Layout ----------
function BrandLogo() {
  return (
    <Link to="/" className="inline-flex items-center gap-2 text-lg font-extrabold tracking-tight">
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-500 text-white shadow-md">
        <span className="text-sm">FX</span>
      </span>
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600">FluxPay</span>
    </Link>
  );
}

function Header() {
  const { currentUser, logout } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <BrandLogo />
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavLinks />
        </nav>
        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              <span className="hidden sm:block text-sm text-muted-foreground">{currentUser.name} · {currentUser.role}</span>
              <button onClick={logout} className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80">Logout</button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80" to="/login">User Login</Link>
              <Link className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90" to="/admin/login">Admin</Link>
            </div>
          )}
        </div>
      </div>
      <div className="md:hidden border-t">
        <div className="px-4 py-3">
          <NavLinks mobile />
        </div>
      </div>
    </header>
  );
}

function NavLinks({ mobile = false }) {
  const { currentUser } = useAuth();
  const base = "text-muted-foreground hover:text-foreground transition";
  const Wrap = mobile ? (p) => <div className="grid gap-2" {...p} /> : (p) => <div className="flex items-center gap-6" {...p} />;
  if (!currentUser) return (
    <Wrap>
      <Link className={base} to="/">Home</Link>
      <Link className={base} to="/login">User Login</Link>
      <Link className={base} to="/admin/login">Admin</Link>
    </Wrap>
  );
  if (currentUser.role === "admin") return (
    <Wrap>
      <Link className={base} to="/admin">Dashboard</Link>
      <Link className={base} to="/admin/plans">Manage Plans</Link>
      <Link className={base} to="/admin/subscriptions">Subscriptions</Link>
      <Link className={base} to="/admin/users">Users</Link>
    </Wrap>
  );
  return (
    <Wrap>
      <Link className={base} to="/dashboard">Dashboard</Link>
      <Link className={base} to="/manage-subscription">Subscription</Link>
      <Link className={base} to="/billing-history">Billing</Link>
    </Wrap>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-muted-foreground">© {new Date().getFullYear()} FluxPay. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <a className="text-muted-foreground hover:text-foreground" href="#">Privacy</a>
          <a className="text-muted-foreground hover:text-foreground" href="#">Terms</a>
        </div>
      </div>
    </footer>
  );
}

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/60 text-foreground">
      <Header />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">{children}</main>
      <Footer />
    </div>
  );
}

// ---------- Auth ----------
function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => readVar("userData", defaultUsers));
  const [currentUser, setCurrentUser] = useState(() => readVar("currentUser", null));

  useEffect(() => writeVar("userData", users), [users]);
  useEffect(() => writeVar("currentUser", currentUser), [currentUser]);

  const login = (email, password, role) => {
    const found = users.find((u) => u.email === email && u.password === password && u.role === role);
    if (!found) throw new Error("Invalid credentials");
    setCurrentUser(found);
  };
  const signup = (firstName, lastName, email, password, role, mobile) => {
    if (users.some((u) => u.email === email)) throw new Error("Email already in use");
    const name = `${firstName} ${lastName}`.trim();
    const newUser = { id: "u_" + Math.random().toString(36).slice(2, 9), firstName, lastName, name, email, password, role, mobile };
    setUsers((u) => [...u, newUser]);
    setCurrentUser(newUser);
  };

  // Create an admin account without changing the currently logged-in user
  const createAdmin = (firstName, lastName, email, password, mobile) => {
    if (users.some((u) => u.email === email)) throw new Error("Email already in use");
    const name = `${firstName} ${lastName}`.trim();
    const newAdmin = { id: "a_" + Math.random().toString(36).slice(2, 9), firstName, lastName, name, email, password, role: "admin", mobile };
    setUsers((u) => [...u, newAdmin]);
    return newAdmin;
  };
  const logout = () => setCurrentUser(null);

  const value = { users, setUsers, currentUser, login, signup, createAdmin, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------- Data Provider ----------
function DataProvider({ children }) {
  const [plans, setPlans] = useState(() => readVar("plans", defaultPlans));
  const [subscriptions, setSubscriptions] = useState(() => readVar("subscriptions", defaultSubs));
  const [subscriptionLogs, setSubscriptionLogs] = useState(() => readVar("subscriptionLogs", defaultLogs));
  const [billingInformation, setBillingInformation] = useState(() => readVar("billingInformation", defaultBilling));

  useEffect(() => writeVar("plans", plans), [plans]);
  useEffect(() => writeVar("subscriptions", subscriptions), [subscriptions]);
  useEffect(() => writeVar("subscriptionLogs", subscriptionLogs), [subscriptionLogs]);
  useEffect(() => writeVar("billingInformation", billingInformation), [billingInformation]);

  const value = {
    plans,
    setPlans,
    subscriptions,
    setSubscriptions,
    subscriptionLogs,
    setSubscriptionLogs,
    billingInformation,
    setBillingInformation,
  };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// ---------- Helpers ----------
const currency = (n) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
const byId = (arr, id) => arr.find((x) => x.id === id);

// ---------- Pages ----------
function Home() {
  return (
    <Layout>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-sky-600 to-emerald-600 p-[1px] shadow-xl">
        <div className="rounded-3xl bg-background p-8 sm:p-12">
          <div className="max-w-4xl mx-auto">
            <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Modern, responsive, single-file
            </p>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Subscriptions & Billing made simple
            </h1>
            <p className="mt-4 text-muted-foreground max-w-prose">
              Manage plans, users and subscriptions with a beautiful, production-ready interface. Client-side routing, runtime data, and custom confirmations included.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/login" className="px-5 py-3 rounded-xl bg-primary text-primary-foreground shadow hover:opacity-90">User Login</Link>
              <Link to="/admin/login" className="px-5 py-3 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80">Admin Portal</Link>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { label: "Plans", value: "CRUD" },
                { label: "Subscriptions", value: "Sortable" },
                { label: "Billing", value: "History" },
                { label: "Modal", value: "Custom" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border bg-card p-4 text-center">
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>
    </Layout>
  );
}

function UserLogin() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("ava@example.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  return (
    <Layout>
      <AuthCard title="User Login" subtitle="Access your dashboard and billing.">
        <form onSubmit={(e)=>{e.preventDefault(); try{ login(email, password, "user"); nav("/dashboard"); }catch(err){ setError(err.message);} }} className="grid gap-4">
          {error && <div className="rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-sm">{error}</div>}
          <Input label="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <button className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-primary-foreground">Login</button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">No account? <Link className="text-indigo-600 hover:underline" to="/signup">Sign up</Link></p>
      </AuthCard>
    </Layout>
  );
}

function UserSignup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  return (
    <Layout>
      <AuthCard title="Create your account" subtitle="Join FluxPay in seconds.">
        <form onSubmit={(e)=>{e.preventDefault(); try{ if(!firstName||!lastName||!mobile||!email||!password||!confirm) throw new Error('All fields are required'); if(password!==confirm) throw new Error('Passwords do not match'); signup(firstName, lastName, email, password, "user", mobile); nav("/dashboard"); }catch(err){ setError(err.message);} }} className="grid gap-4">
          {error && <div className="rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <Input label="First Name" value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
            <Input label="Last Name" value={lastName} onChange={(e)=>setLastName(e.target.value)} />
          </div>
          <Input label="Mobile Number" value={mobile} onChange={(e)=>setMobile(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <Input label="Confirm Password" type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
          <button className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-primary-foreground">Create account</button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">Have an account? <Link className="text-indigo-600 hover:underline" to="/login">Login</Link></p>
      </AuthCard>
    </Layout>
  );
}

function AdminLogin() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState("");
  return (
    <Layout>
      <AuthCard title="Admin Login" subtitle="Manage plans, users, and subscriptions.">
        <form onSubmit={(e)=>{e.preventDefault(); try{ login(email, password, "admin"); nav("/admin"); }catch(err){ setError(err.message);} }} className="grid gap-4">
          {error && <div className="rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-sm">{error}</div>}
          <Input label="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <button className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-primary-foreground">Login</button>
        </form>
      </AuthCard>
    </Layout>
  );
}

function AdminSignup() {
  const { createAdmin } = useAuth();
  const nav = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!firstName || !lastName || !mobile || !email || !password || !confirm) return setError("All fields are required.");
    if (password !== confirm) return setError("Passwords do not match.");
    try {
      createAdmin(firstName.trim(), lastName.trim(), email.trim(), password, mobile.trim());
      setSuccess("Admin account created. You can now login.");
      setTimeout(()=>nav('/admin/login'), 1000);
    } catch (err) {
      setError(err?.message || String(err));
    }
  };

  return (
    <Layout>
      <AuthCard title="Create admin account" subtitle="Fill all mandatory fields.">
        <form onSubmit={handleSubmit} className="grid gap-4">
          {error && <div className="rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-sm">{error}</div>}
          {success && <div className="rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">{success}</div>}
          <div className="grid grid-cols-2 gap-2">
            <Input label="First Name" value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
            <Input label="Last Name" value={lastName} onChange={(e)=>setLastName(e.target.value)} />
          </div>
          <Input label="Mobile Number" value={mobile} onChange={(e)=>setMobile(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <Input label="Confirm Password" type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
          <button className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-primary-foreground">Create admin</button>
        </form>
      </AuthCard>
    </Layout>
  );
}

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative rounded-3xl bg-gradient-to-br from-indigo-600 via-sky-600 to-emerald-600 p-[1px] shadow-xl">
        <div className="rounded-3xl bg-background p-8">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input {...props} className="rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
    </label>
  );
}

// ----- User pages -----
function UserDashboard() {
  const { currentUser } = useAuth();
  const { plans, subscriptions, billingInformation } = useData();
  const sub = subscriptions.find((s) => s.userId === currentUser.id);
  const plan = sub ? byId(plans, sub.planId) : null;
  const bills = billingInformation.filter((b) => b.userId === currentUser.id).slice(0, 5);
  return (
    <Layout>
      <h2 className="text-2xl font-bold">Welcome, {currentUser.name}</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Stat title="Current Plan" value={plan ? plan.name : "None"} helper={plan ? `${currency(plan.price)}/${plan.interval}` : "—"} />
        <Stat title="Status" value={sub ? sub.status : "No subscription"} helper={sub ? `Renews ${sub.renewDate}` : ""} />
        <Stat title="Recent Charges" value={bills.length} helper="Last 5 shown" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Subscription Summary">
          {sub ? (
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between"><span>Plan</span><span className="font-medium">{plan.name}</span></div>
              <div className="flex justify-between"><span>Status</span><span className="font-medium">{sub.status}</span></div>
              <div className="flex justify-between"><span>Start</span><span className="font-medium">{sub.startDate}</span></div>
              <div className="flex justify-between"><span>Next Renewal</span><span className="font-medium">{sub.renewDate}</span></div>
              <div className="mt-4"><Link to="/manage-subscription" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Manage subscription</Link></div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">No active subscription. Choose a plan to get started.</p>
              <Link to="/manage-subscription" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">View plans</Link>
            </div>
          )}
        </Card>
        <Card title="Recent Billing">
          <Table
            columns={["Date", "Description", "Amount", "Status"]}
            rows={bills.map((b) => [b.date, b.description, currency(b.amount), (
              <span key={b.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${b.status === "paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{b.status}</span>
            )])}
          />
        </Card>
      </div>
    </Layout>
  );
}

function ManageSubscription() {
  const { currentUser } = useAuth();
  const { plans, subscriptions, setSubscriptions, subscriptionLogs, setSubscriptionLogs, billingInformation, setBillingInformation } = useData();
  const active = subscriptions.find((s) => s.userId === currentUser.id);
  const { confirm, modal } = useConfirm();

  const changePlan = async (nextPlanId) => {
    const plan = byId(plans, nextPlanId);
    const ok = await confirm("Confirm change", `Switch to ${plan.name} for ${currency(plan.price)}/${plan.interval}?`);
    if (!ok) return;
    if (active) {
      setSubscriptions((prev) => prev.map((s) => s.id === active.id ? { ...s, planId: nextPlanId, status: "active" } : s));
      setSubscriptionLogs((l) => [...l, { id: "l_"+crypto.randomUUID(), subscriptionId: active.id, userId: currentUser.id, action: "plan_changed", date: new Date().toISOString().slice(0,10) }]);
    } else {
      const id = "s_" + Math.random().toString(36).slice(2,9);
      const start = new Date().toISOString().slice(0,10);
      setSubscriptions((prev) => [...prev, { id, userId: currentUser.id, planId: nextPlanId, status: "active", startDate: start, renewDate: start }]);
      setSubscriptionLogs((l) => [...l, { id: "l_"+crypto.randomUUID(), subscriptionId: id, userId: currentUser.id, action: "created", date: start }]);
    }
    setBillingInformation((b) => [...b, { id: "b_"+Math.random().toString(36).slice(2,9), userId: currentUser.id, amount: plan.price, currency: "USD", date: new Date().toISOString().slice(0,10), status: "paid", description: `${plan.name} change` }]);
  };

  const cancel = async () => {
    if (!active) return;
    const ok = await confirm("Cancel subscription", "Are you sure you want to cancel your subscription?");
    if (!ok) return;
    setSubscriptions((prev) => prev.map((s) => s.id === active.id ? { ...s, status: "canceled" } : s));
    setSubscriptionLogs((l) => [...l, { id: "l_"+crypto.randomUUID(), subscriptionId: active.id, userId: currentUser.id, action: "canceled", date: new Date().toISOString().slice(0,10) }]);
  };

  return (
    <Layout>
      {modal}
      <h2 className="text-2xl font-bold">Manage Subscription</h2>
      <p className="mt-1 text-sm text-muted-foreground">Upgrade, downgrade, or cancel at any time.</p>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const isActive = active && active.planId === p.id && active.status === "active";
          return (
            <div key={p.id} className={`relative rounded-2xl border bg-card p-6 shadow-sm ${p.popular ? "ring-2 ring-indigo-500" : ""}`}>
              {p.popular && <span className="absolute -top-3 right-4 rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white shadow">Popular</span>}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-4 text-3xl font-extrabold">{currency(p.price)}<span className="text-base font-medium text-muted-foreground">/{p.interval}</span></div>
              <ul className="mt-4 grid gap-1 text-sm text-muted-foreground">
                {p.features.map((f) => <li key={f} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {f}</li>)}
              </ul>
              <div className="mt-6 flex items-center gap-3">
                {isActive ? (
                  <button disabled className="flex-1 rounded-lg bg-muted px-4 py-2 text-sm">Current</button>
                ) : (
                  <button onClick={()=>changePlan(p.id)} className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Choose</button>
                )}
                {active && isActive && (
                  <button onClick={cancel} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}

function BillingHistory() {
  const { currentUser } = useAuth();
  const { billingInformation } = useData();
  const [q, setQ] = useState("");
  const rows = billingInformation
    .filter((b) => b.userId === currentUser.id)
    .filter((b) => [b.description, b.date, b.status].join(" ").toLowerCase().includes(q.toLowerCase()))
    .sort((a,b)=> b.date.localeCompare(a.date));
  return (
    <Layout>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Billing History</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your invoices and charges.</p>
        </div>
        <div className="w-full max-w-xs">
          <Input label="Search" value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>
      </div>
      <div className="mt-6">
        <Table
          columns={["Date", "Description", "Amount", "Status"]}
          rows={rows.map((b)=> [b.date, b.description, currency(b.amount), (
            <span key={b.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${b.status === "paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{b.status}</span>
          )])}
        />
      </div>
    </Layout>
  );
}

// ----- Admin pages -----
function AdminDashboard() {
  const { plans, subscriptions } = useData();
  const { createAdmin } = useAuth();
  const counts = useMemo(() => plans.map((p) => ({ plan: p, count: subscriptions.filter((s) => s.planId === p.id && s.status === "active").length })), [plans, subscriptions]);
  const top = [...counts].sort((a,b)=> b.count - a.count).slice(0,5);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const creating = useMemo(() => false, []);

  const handleCreateAdmin = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      createAdmin(name.trim(), email.trim(), password);
      setSuccess("Admin account created successfully.");
      setName(""); setEmail(""); setPassword("");
    } catch (err) {
      setError(err?.message || String(err));
    }
  };

  return (
    <Layout>
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>
      <p className="mt-1 text-sm text-muted-foreground">Quick overview and navigation.</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Active Plans" value={plans.length} />
        <Stat title="Active Subscriptions" value={subscriptions.filter(s=>s.status==="active").length} />
        <Stat title="Canceled" value={subscriptions.filter(s=>s.status==="canceled").length} />
        <Stat title="Total Users" value={new Set(subscriptions.map(s=>s.userId)).size} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Top Plans">
          <Table columns={["Plan", "Subscribers"]} rows={top.map((t)=> [t.plan.name, t.count])} />
        </Card>
        <div className="space-y-6">
          <Card title="Quick Links">
            <div className="grid sm:grid-cols-2 gap-4">
              <QuickLink to="/admin/plans" title="Manage Plans" desc="Create, update, delete" />
              <QuickLink to="/admin/subscriptions" title="Subscriptions" desc="All subscriptions" />
              <QuickLink to="/admin/users" title="Users" desc="All users" />
              <QuickLink to="/admin/signup" title="Add Admin" desc="Create new admin" />
              <QuickLink to="/" title="Homepage" desc="Public landing" />
            </div>
          </Card>

          </div>
      </div>
    </Layout>
  );
}

function QuickLink({ to, title, desc }) {
  return (
    <Link to={to} className="group rounded-xl border p-4 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-muted-foreground">{desc}</div>
        </div>
        <span className="rounded-full bg-indigo-50 text-indigo-600 px-2 py-0.5 text-xs group-hover:bg-indigo-100">Open</span>
      </div>
    </Link>
  );
}

function ManagePlans() {
  const { plans, setPlans } = useData();
  const { confirm, modal } = useConfirm();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", price: 0, interval: "mo", description: "", features: "" });

  const startEdit = (p) => {
    setEditing(p.id);
    setForm({ name: p.name, price: p.price, interval: p.interval, description: p.description, features: p.features.join(", ") });
  };
  const save = () => {
    if (!form.name) return;
    if (editing) {
      setPlans((ps) => ps.map((p) => p.id === editing ? { ...p, ...form, price: Number(form.price), features: form.features.split(",").map(f=>f.trim()).filter(Boolean) } : p));
      setEditing(null);
    } else {
      const id = form.name.toLowerCase().replace(/\s+/g, "-") + "-" + Math.random().toString(36).slice(2,5);
      setPlans((ps) => [...ps, { id, name: form.name, price: Number(form.price), interval: form.interval, description: form.description, features: form.features.split(",").map(f=>f.trim()).filter(Boolean), popular: false }]);
    }
    setForm({ name: "", price: 0, interval: "mo", description: "", features: "" });
  };
  const remove = async (id) => {
    const ok = await confirm("Delete plan", "This action cannot be undone.");
    if (!ok) return;
    setPlans((ps) => ps.filter((p) => p.id !== id));
  };

  return (
    <Layout>
      {modal}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Manage Plans</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create, update, and delete plans.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Table
            columns={["Name", "Price", "Interval", "Popular", "Actions"]}
            rows={plans.map((p)=> [
              editing===p.id ? <input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="w-full rounded border px-2 py-1" /> : p.name,
              editing===p.id ? <input type="number" value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})} className="w-24 rounded border px-2 py-1" /> : currency(p.price),
              editing===p.id ? (
                <select value={form.interval} onChange={(e)=>setForm({...form,interval:e.target.value})} className="rounded border px-2 py-1"><option value="mo">mo</option><option value="yr">yr</option></select>
              ) : p.interval,
              (
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!p.popular} onChange={(e)=>setPlans(ps=>ps.map(x=>x.id===p.id?{...x,popular:e.target.checked}:x))} /> Popular</label>
              ),
              (
                <div className="flex gap-2">
                  {editing===p.id ? (
                    <>
                      <button onClick={save} className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground">Save</button>
                      <button onClick={()=>{setEditing(null); setForm({ name: "", price: 0, interval: "mo", description: "", features: "" });}} className="rounded border px-3 py-1 text-xs">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={()=>startEdit(p)} className="rounded border px-3 py-1 text-xs">Edit</button>
                      <button onClick={()=>remove(p.id)} className="rounded bg-destructive/10 text-destructive px-3 py-1 text-xs">Delete</button>
                    </>
                  )}
                </div>
              ),
            ])}
          />
        </div>
        <div>
          <Card title={editing?"Edit Plan":"Create Plan"}>
            <div className="grid gap-3">
              <Input label="Name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
              <Input label="Price" type="number" value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})} />
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Interval</span>
                <select value={form.interval} onChange={(e)=>setForm({...form,interval:e.target.value})} className="rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="mo">Monthly</option>
                  <option value="yr">Yearly</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Description</span>
                <textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="min-h-[80px] rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Features (comma separated)</span>
                <textarea value={form.features} onChange={(e)=>setForm({...form,features:e.target.value})} className="min-h-[60px] rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </label>
              <button onClick={save} className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-primary-foreground">{editing?"Save changes":"Create plan"}</button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function ManageSubscriptionsAdmin() {
  const { plans, subscriptions } = useData();
  const [sort, setSort] = useState({ key: "date", dir: "desc" });
  const rows = subscriptions
    .map((s)=> ({ ...s, planName: byId(plans, s.planId)?.name ?? s.planId }))
    .sort((a,b)=> sort.dir === "asc" ? (a[sort.key] ?? "").localeCompare(b[sort.key] ?? "") : (b[sort.key] ?? "").localeCompare(a[sort.key] ?? ""));
  return (
    <Layout>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">All Subscriptions</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sortable table of subscriptions.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="grid gap-1">
            <span className="text-muted-foreground">Sort by</span>
            <select value={sort.key} onChange={(e)=>setSort((s)=>({...s,key:e.target.value}))} className="rounded border px-2 py-1">
              <option value="planName">Plan</option>
              <option value="status">Status</option>
              <option value="startDate">Start</option>
              <option value="renewDate">Renew</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-muted-foreground">Direction</span>
            <select value={sort.dir} onChange={(e)=>setSort((s)=>({...s,dir:e.target.value}))} className="rounded border px-2 py-1">
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </label>
        </div>
      </div>
      <div className="mt-6">
        <Table
          columns={["User", "Plan", "Status", "Start", "Renew"]}
          rows={rows.map((s)=> [s.userId, s.planName, (
            <span key={s.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${s.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{s.status}</span>
          ), s.startDate ?? "—", s.renewDate ?? "—"]) }
        />
      </div>
    </Layout>
  );
}

function ManageUsers() {
  const { users } = useAuth();
  const { subscriptions } = useData();
  const stats = (id) => subscriptions.find((s)=>s.userId===id);
  return (
    <Layout>
      <h2 className="text-2xl font-bold">Users</h2>
      <p className="mt-1 text-sm text-muted-foreground">All registered users.</p>
      <div className="mt-6">
        <Table
          columns={["Name", "Email", "Role", "Subscription"]}
          rows={users.map((u)=> [u.name, u.email, u.role, (stats(u.id)?.planId ?? "—")])}
        />
      </div>
    </Layout>
  );
}

// ---------- Reusable UI ----------
function Card({ title, children }) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      {title && <div className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground">{title}</div>}
      {children}
    </div>
  );
}
function Stat({ title, value, helper }) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {helper && <div className="mt-1 text-xs text-muted-foreground">{helper}</div>}
    </div>
  );
}
function Table({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="min-w-full divide-y">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr><td className="px-4 py-6 text-sm text-muted-foreground" colSpan={columns.length}>No data</td></tr>
          ) : rows.map((r, i) => (
            <tr key={i} className="hover:bg-muted/30">
              {r.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-sm align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Routing guards ----------
function RequireAuth({ role, children }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  if (!currentUser) return <Navigate to={role === "admin" ? "/admin/login" : "/login"} state={{ from: location }} replace />;
  if (role && currentUser.role !== role) return <Navigate to={currentUser.role === "admin" ? "/admin" : "/dashboard"} replace />;
  return children;
}

// ---------- App ----------
function AppInner() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* User auth */}
        <Route path="/login" element={<UserLogin />} />
        <Route path="/signup" element={<UserSignup />} />

        {/* Admin auth */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/signup" element={<RequireAuth role="admin"><AdminSignup /></RequireAuth>} />

        {/* User pages */}
        <Route path="/dashboard" element={<RequireAuth role="user"><UserDashboard /></RequireAuth>} />
        <Route path="/manage-subscription" element={<RequireAuth role="user"><ManageSubscription /></RequireAuth>} />
        <Route path="/billing-history" element={<RequireAuth role="user"><BillingHistory /></RequireAuth>} />

        {/* Admin pages */}
        <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
        <Route path="/admin/plans" element={<RequireAuth role="admin"><ManagePlans /></RequireAuth>} />
        <Route path="/admin/subscriptions" element={<RequireAuth role="admin"><ManageSubscriptionsAdmin /></RequireAuth>} />
        <Route path="/admin/users" element={<RequireAuth role="admin"><ManageUsers /></RequireAuth>} />

        <Route path="*" element={<Layout><div className="text-center py-24"><h2 className="text-2xl font-bold">Page not found</h2><p className="mt-2 text-muted-foreground">Use the navigation to continue.</p></div></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}

function Root() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppInner />
      </DataProvider>
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
