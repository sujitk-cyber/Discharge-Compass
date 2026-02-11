"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Container from "../../components/Container";
import SectionHeader from "../../components/SectionHeader";
import { login, register } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (tab === "register") {
        await register(email, name, password);
      } else {
        await login(email, password);
      }
      router.push("/batch-upload");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <SectionHeader
        title={tab === "login" ? "Sign in" : "Create account"}
        subtitle="Sign in to save your batch uploads and view past results."
      />
      <div className="login-card">
        <div className="login-tabs">
          <button
            className={`login-tab ${tab === "login" ? "login-tab--active" : ""}`}
            onClick={() => { setTab("login"); setError(null); }}
          >
            Sign in
          </button>
          <button
            className={`login-tab ${tab === "register" ? "login-tab--active" : ""}`}
            onClick={() => { setTab("register"); setError(null); }}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {tab === "register" && (
            <div className="field">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Jane Smith"
                required
              />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@hospital.org"
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === "register" ? "At least 6 characters" : ""}
              required
              minLength={tab === "register" ? 6 : undefined}
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button className="button login-submit" type="submit" disabled={loading}>
            {loading ? "Please wait..." : tab === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </Container>
  );
}
