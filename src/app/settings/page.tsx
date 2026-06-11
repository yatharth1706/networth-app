"use client";

import { useRef, useState } from "react";
import { Download, ShieldCheck, Trash2, Upload } from "lucide-react";
import { getStorage } from "@/lib/storage";
import { APP_NAME } from "@/lib/config";
import { SCHEMA_VERSION, type ExportData } from "@/lib/types";
import { todayISO } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Settings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport() {
    const data = await getStorage().exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${APP_NAME.toLowerCase()}-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Backup downloaded.");
  }

  async function handleImportFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as ExportData;
      if (!Array.isArray(parsed.accounts) || typeof parsed.schemaVersion !== "number") {
        throw new Error("This file doesn't look like a valid backup.");
      }
      const ok = window.confirm(
        `Import backup from ${parsed.exportedAt?.slice(0, 10) ?? "unknown date"}? ` +
          `This REPLACES all data currently in this browser ` +
          `(${parsed.accounts.length} accounts, ${parsed.transactions?.length ?? 0} transactions in the backup).`,
      );
      if (!ok) return;
      await getStorage().importData(parsed);
      setMessage("Backup imported. All data restored.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleClear() {
    const ok = window.confirm(
      "Delete ALL data from this browser? This cannot be undone. " +
        "Consider exporting a backup first.",
    );
    if (!ok) return;
    await getStorage().clearAll();
    setMessage("All data deleted.");
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-positive" /> Your data lives here
          </CardTitle>
          <CardDescription>
            Everything is stored in this browser (IndexedDB) — nothing is sent
            to any server. That also means clearing browser data deletes it, so
            keep a backup.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup</CardTitle>
          <CardDescription>
            Export everything as a JSON file, or restore a previous backup
            (schema v{SCHEMA_VERSION}).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleExport}>
            <Download /> Export backup
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload /> Import backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Permanently delete all accounts, snapshots, and transactions from
            this browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleClear}>
            <Trash2 /> Delete all data
          </Button>
        </CardContent>
      </Card>

      {message && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
