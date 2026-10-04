"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { SignOutButton } from "@/components/features/desk/SignOutButton";

export function AccountMenu({
  fullName,
  planLine,
}: {
  fullName: string;
  planLine: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (event.target instanceof Node && el.contains(event.target)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      className={
        open
          ? "desk__account desk__account--open desk__who-row"
          : "desk__account desk__who-row"
      }
      ref={rootRef}
    >
      <button
        type="button"
        className="desk__account-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="desk__who">
          <strong className="desk__account-name">{fullName}</strong>
          <span>{planLine}</span>
        </span>
      </button>
      {open ? (
        <div className="desk__account-menu" id={menuId} role="menu">
          <Link href="/settings/profile" className="desk__account-item" role="menuitem">
            Profile
          </Link>
          <div className="desk__account-item desk__account-item--signout" role="none">
            <SignOutButton />
          </div>
        </div>
      ) : null}
    </div>
  );
}
