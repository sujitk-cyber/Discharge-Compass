"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUser, isLoggedIn, logout } from "../lib/auth";

const links = [
  { href: "/", label: "Home" },
  { href: "/risk-calculator", label: "Calculator" },
  { href: "/batch-upload", label: "Batch Upload" },
  { href: "/risk-surface", label: "Landscape" },
  { href: "/analytics", label: "Analytics" },
  { href: "/fairness", label: "Fairness" },
  { href: "/model-card", label: "Model Card" },
];

function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" stroke="url(#logo-grad)" strokeWidth="1.5" />
      <path
        d="M12 5 L12 19 M8 9 L12 5 L16 9"
        stroke="url(#logo-grad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Navigation() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    const u = getUser();
    if (u) setUserName(u.name);
  }, []);

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
    setUserName("");
    window.location.href = "/";
  };

  return (
    <nav className="nav">
      <Link href="/" className="nav-brand">
        <LogoMark />
        <span className="nav-wordmark">Discharge Compass</span>
      </Link>
      <div className="nav-links">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="nav-link">
            {link.label}
          </Link>
        ))}
      </div>
      <div className="nav-auth">
        {loggedIn ? (
          <>
            <span className="nav-user-name">{userName}</span>
            <button className="nav-auth-btn" onClick={handleLogout}>Sign out</button>
          </>
        ) : (
          <Link href="/login" className="nav-auth-btn">Sign in</Link>
        )}
      </div>
    </nav>
  );
}
