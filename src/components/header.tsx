"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Wallet } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { Button } from "@/components/ui/button";

const PRIVACY_KEY = "privacy-mode";

export function Header() {
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
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Wallet className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            {APP_NAME}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePrivacy}
          title={privacy ? "Show amounts" : "Hide amounts"}
        >
          {privacy ? <EyeOff /> : <Eye />}
        </Button>
      </div>
    </header>
  );
}
