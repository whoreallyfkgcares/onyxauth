"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DOMAINS = [
  "gmail.com",
  "outlook.com",
  "icloud.com",
  "yahoo.com",
  "hotmail.com",
  "proton.me",
  "me.com",
];

interface DropdownPos { top: number; left: number; width: number }

interface EmailInputProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export function EmailInput({ value, onChange, ...props }: EmailInputProps) {
  const [focused, setFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const atIdx = value.indexOf("@");
  const hasAt = atIdx !== -1;
  const prefix = hasAt ? value.slice(0, atIdx) : value;
  const domain = hasAt ? value.slice(atIdx + 1) : "";

  const suggestions = hasAt
    ? DOMAINS.filter((d) => domain === "" || (d.startsWith(domain) && d !== domain))
    : [];

  const open = focused && showDropdown && suggestions.length > 0;

  // Measure input position when dropdown opens so the portal can anchor to it.
  useLayoutEffect(() => {
    if (open && inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  }, [open]);

  function handleChange(v: string) {
    onChange(v);
    setActiveIdx(0);
    // Only open dropdown when typing forward — never on backspace/delete
    if (v.length > value.length) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }

  function select(d: string) {
    onChange(`${prefix}@${d}`);
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (suggestions[activeIdx]) {
        e.preventDefault();
        select(suggestions[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  return (
    <>
      <Input
        {...props}
        ref={inputRef}
        type="text"
        inputMode="email"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
            className="overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 slide-in-from-top-1 duration-100"
          >
            {suggestions.map((d, i) => (
              <button
                key={d}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); select(d); }}
                onMouseEnter={() => setActiveIdx(i)}
                className={cn(
                  "flex w-full items-baseline gap-0.5 px-3 py-2 text-xs text-left transition-colors",
                  i === activeIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                )}
              >
                <span className="text-muted-foreground">{prefix}@</span>
                <span>{d}</span>
              </button>
            ))}
          </div>,
          document.body,
        )
      }
    </>
  );
}
