"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  Eye,
  EyeOff,
  LayoutDashboard,
  ReceiptIndianRupee,
  Settings,
  Wallet,
} from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const PRIVACY_KEY = "privacy-mode";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: ReceiptIndianRupee },
  { href: "/close", label: "Monthly close", icon: CalendarCheck },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Header() {
  const pathname = usePathname();
  const [privacy, setPrivacy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(PRIVACY_KEY) === "1";
    document.documentElement.classList.toggle("privacy-mode", saved);
    if (saved) {
      // Deferred so the saved preference doesn't clash with the prerendered HTML.
      queueMicrotask(() => setPrivacy(true));
    }
  }, []);

  function togglePrivacy() {
    const next = !privacy;
    setPrivacy(next);
    localStorage.setItem(PRIVACY_KEY, next ? "1" : "0");
    document.documentElement.classList.toggle("privacy-mode", next);
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Wallet className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            {APP_NAME}
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
                pathname === href
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePrivacy}
            title={privacy ? "Show amounts" : "Hide amounts"}
          >
            {privacy ? <EyeOff /> : <Eye />}
          </Button>
        </nav>
      </div>
    </header>
  );
}
