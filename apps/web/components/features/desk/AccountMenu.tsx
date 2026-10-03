"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

import { SignOutButton } from "@/components/features/desk/SignOutButton";
import { initials } from "@/lib/desk/identity";

export function AccountMenu({
  fullName,
}: {
  fullName: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      if (!root.current?.contains(ev.target as Node)) setOpen(false);
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="desk__account" ref={root}>
      <button
        type="button"
        className="desk__account-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="desk__account-name">{fullName}</span>
        <span className="desk__avatar" aria-hidden>
          {initials(fullName)}
        </span>
      </button>
      {open ? (
        <div className="desk__account-menu" id={menuId} role="menu">
          <Link
            href="/settings/profile"
            role="menuitem"
            className="desk__account-item"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <div className="desk__account-item desk__account-item--signout">
            <SignOutButton />
          </div>
        </div>
      ) : null}
    </div>
  );
}
