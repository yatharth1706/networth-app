"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileUp, ShieldCheck } from "lucide-react";
import { getStorage } from "@/lib/storage";
import { syncAccountValues } from "@/lib/prices";
import { formatCurrency } from "@/lib/config";
import type { CasSummary } from "@/lib/cas";
import { uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CAS_ACCOUNT_NAME = "Mutual Funds (CAS)";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CasSummary | null>(null);
  const [imported, setImported] = useState(false);

  async function handleParse() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setImported(false);
    try {
      // Loaded on demand so pdf.js never enters the initial bundle.
      const { parseCasPdf, CasPasswordError } = await import("@/lib/cas");
      try {
        setResult(await parseCasPdf(file, password));
      } catch (err) {
        if (err instanceof CasPasswordError) {
          setError("That password didn't open the PDF. CAS passwords are usually your PAN in CAPITALS or whatever you chose while requesting the statement.");
        } else {
          throw err;
        }
      }
    } catch {
      setError("Couldn't read this PDF. Make sure it's a CAMS/KFintech Consolidated Account Summary.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    if (!result || result.schemes.length === 0) return;
    setBusy(true);
    try {
      const storage = getStorage();
      const accounts = await storage.getAccounts(true);
      let account = accounts.find((a) => a.name === CAS_ACCOUNT_NAME);
      const now = new Date().toISOString();
      if (!account) {
        account = {
          id: uid(),
          name: CAS_ACCOUNT_NAME,
          type: "mutual_fund",
          kind: "asset",
          currentValue: 0,
          createdAt: now,
          updatedAt: now,
        };
        await storage.saveAccount(account);
      }
      // Re-importing replaces the previous statement's holdings wholesale —
      // the statement is the source of truth for this account.
      for (const existing of await storage.getHoldings(account.id)) {
        await storage.deleteHolding(existing.id);
      }
      for (const scheme of result.schemes) {
        await storage.saveHolding({
          id: uid(),
          accountId: account.id,
          name: scheme.name,
          identifier: scheme.isin ?? undefined,
          units: scheme.units,
          lastPrice: scheme.nav,
          lastPriceAt: scheme.navDate ?? undefined,
        });
      }
      await syncAccountValues(storage, [account.id]);
      setImported(true);
    } finally {
      setBusy(false);
    }
  }

  const total = result?.schemes.reduce((sum, s) => sum + s.marketValue, 0) ?? 0;

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Import CAS</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-positive" /> Parsed in your browser
          </CardTitle>
          <CardDescription>
            Upload your CAMS / KFintech <strong>Consolidated Account Summary</strong>{" "}
            and all your mutual fund holdings are imported in one go. The PDF and
            its password are processed entirely on this device — nothing is
            uploaded anywhere. Don&apos;t have a CAS? Request one (free) at{" "}
            <a
              href="https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              camsonline.com
            </a>{" "}
            — it arrives by email in minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="cas-file">CAS PDF</Label>
            <Input
              id="cas-file"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cas-password">PDF password</Label>
            <Input
              id="cas-password"
              type="password"
              placeholder="usually your PAN"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleParse} disabled={!file || busy}>
            <FileUp /> {busy && !result ? "Parsing…" : "Parse statement"}
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-negative">{error}</p>}

      {result && result.schemes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Found {result.schemes.length} schemes
              {result.asOn && ` · as on ${result.asOn}`}
            </CardTitle>
            <CardDescription>
              Review and import — they&apos;ll appear as holdings under a{" "}
              &ldquo;{CAS_ACCOUNT_NAME}&rdquo; account. Re-importing a newer
              statement replaces them.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ul className="divide-y divide-border">
              {result.schemes.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{s.name}</span>
                    <span className="block text-xs text-muted-foreground" data-amount>
                      Folio {s.folio} · {s.units} units × ₹{s.nav} · {s.registrar}
                    </span>
                  </span>
                  <span className="text-sm font-medium" data-amount>
                    {formatCurrency(s.marketValue)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-sm font-semibold" data-amount>
                {formatCurrency(total)}
              </span>
            </div>
            {result.warnings.map((w, i) => (
              <p key={i} className="text-xs text-negative">⚠ {w}</p>
            ))}
            {imported ? (
              <div className="flex items-center gap-3">
                <p className="flex items-center gap-1.5 text-sm text-positive">
                  <CheckCircle2 className="h-4 w-4" /> Imported!
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/">Go to dashboard</Link>
                </Button>
              </div>
            ) : (
              <Button onClick={handleImport} disabled={busy} className="justify-self-start">
                {busy ? "Importing…" : `Import ${result.schemes.length} holdings`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {result && result.schemes.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {result.warnings[0] ?? "No holdings found in this PDF."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
