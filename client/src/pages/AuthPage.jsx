import { useState } from "react";
import { ArrowRight, BookOpen, Droplet } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const { authenticate } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (isRegister && !name.trim()) {
      return setError("Please enter your name.");
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError("Please enter a valid email address.");
    }
    if (!password || password.trim().length < 8) {
      return setError("Password must be at least 8 characters.");
    }

    setBusy(true);
    setError("");
    try {
      const payload = isRegister
        ? { name: name.trim(), email: email.trim(), password }
        : { email: email.trim(), password };
      await authenticate(isRegister ? "register" : "login", payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function fillDemoCredentials() {
    setIsRegister(false);
    setEmail("demo@sweety.app");
    setPassword("Password123!");
    setError("");
  }

  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <div className="brand">
          <span className="brand-icon">
            <Droplet />
          </span>
          Sweety
        </div>
        <div className="auth-hero">
          <span className="eyebrow">BLOOD GLUCOSE TRACKER</span>
          <h1>Track daily glucose readings with clarity.</h1>
          <p>
            Log up to four readings each day across fasting and post-meal time
            slots, and review daily, month-to-date, and monthly summaries.
          </p>
        </div>
        <ul className="auth-features">
          <li>4 structured daily meal slots (40–600 mg/dl)</li>
          <li>Daily, month-to-date, and previous month reports</li>
          <li>Private per-user history and trend chart</li>
        </ul>
      </section>

      <section className="auth-form">
        <form onSubmit={submit} noValidate>
          <h2>{isRegister ? "Create an account" : "Sign in"}</h2>
          <p className="muted">
            {isRegister
              ? "Register with your name, email, and password."
              : "Sign in to view and manage your readings."}
          </p>

          {isRegister && (
            <>
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                autoComplete="name"
                placeholder="Jane Doe"
              />
            </>
          )}

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder="At least 8 characters"
          />

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="primary w-full mt-6" disabled={busy}>
            {busy
              ? "Please wait…"
              : isRegister
                ? "Create account"
                : "Sign in"}
            <ArrowRight size={17} />
          </button>

          <p className="auth-switch muted">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
            >
              {isRegister ? "Sign in" : "Register"}
            </button>
          </p>

          <div className="demo-note">
            <BookOpen size={18} />
            <div className="demo-note-text">
              <strong>Demo account</strong>
              <small>demo@sweety.app · Password123!</small>
            </div>
            <button
              type="button"
              className="secondary demo-fill-btn"
              onClick={fillDemoCredentials}
            >
              Use demo
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
