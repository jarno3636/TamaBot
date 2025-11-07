"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RunResult =
  | { ok: true; already?: boolean; id: number; fid?: number; pinned?: boolean }
  | { ok: false; error: string };

export default function AdminToolsPage() {
  const [adminToken, setAdminToken] = useState("");
  const [singleId, setSingleId] = useState<string>("");
  const [fromId, setFromId] = useState<string>("1");
  const [toId, setToId] = useState<string>("10");
  const [delayMs, setDelayMs] = useState<string>("150");

  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  // persist token locally (only in your browser)
  useEffect(() => {
    const cached = localStorage.getItem("tamabot_admin_token") || "";
    if (cached) setAdminToken(cached);
  }, []);
  useEffect(() => {
    if (adminToken) localStorage.setItem("tamabot_admin_token", adminToken);
  }, [adminToken]);

  const addLog = useCallback((line: string) => {
    setLogs((l) => [...l, line]);
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  const canRunSingle = useMemo(() => /^\d+$/.test(singleId), [singleId]);
  const canRunRange = useMemo(() => /^\d+$/.test(fromId) && /^\d+$/.test(toId), [fromId, toId]);

  async function runSingle() {
    if (!canRunSingle || busy) return;
    setBusy(true);
    setLogs([]);
    try {
      const url = new URL("/api/admin/run-backfill", window.location.origin);
      url.searchParams.set("id", singleId);

      const res = await fetch(url.toString(), {
        headers: { "x-admin-token": adminToken || "" },
        cache: "no-store",
      });
      const j = (await res.json()) as RunResult & Record<string, any>;
      if (j.ok) {
        addLog(`✅ id=${j.id} ok${j.already ? " (already)" : ""}${j.fid ? ` fid=${j.fid}` : ""}`);
      } else {
        addLog(`❌ id=${singleId} error: ${j.error || "unknown"}`);
      }
      addLog(JSON.stringify(j, null, 2));
    } catch (e: any) {
      addLog(`❌ id=${singleId} exception: ${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function runRange() {
    if (!canRunRange || busy) return;
    setBusy(true);
    setLogs([]);
    try {
      const body = {
        from: Number(fromId),
        to: Number(toId),
        delayMs: Number(delayMs || "150"),
      };
      const res = await fetch("/api/admin/backfill", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": adminToken || "",
        },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as {
        ok: boolean;
        range?: { from: number; to: number };
        done: number[];
        failed: { id: number; err: string }[];
      } & Record<string, any>;
      if (j.ok) {
        addLog(`✅ range ok from=${j.range?.from} to=${j.range?.to}`);
        addLog(`done: ${j.done?.join(", ") || "(none)"}`);
        if (j.failed?.length) {
          for (const f of j.failed) addLog(`❌ id=${f.id} err=${f.err}`);
        }
      } else {
        addLog(`❌ range error: ${j.error || "unknown"}`);
      }
      addLog(JSON.stringify(j, null, 2));
    } catch (e: any) {
      addLog(`❌ range exception: ${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Tools</h1>

      <section className="glass glass-pad space-y-3">
        <h2 className="text-lg font-semibold">Auth</h2>
        <input
          className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/15"
          placeholder="ADMIN_TOKEN"
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
        />
        <p className="text-sm text-white/70">
          Set <code>ADMIN_TOKEN</code> in Vercel env. This UI sends it as <code>x-admin-token</code>.
        </p>
      </section>

      <section className="glass glass-pad space-y-4">
        <h2 className="text-lg font-semibold">Backfill a single token</h2>
        <div className="flex gap-3">
          <input
            className="px-3 py-2 rounded-lg bg-black/30 border border-white/15"
            placeholder="token id (e.g. 42)"
            value={singleId}
            onChange={(e) => setSingleId(e.target.value.trim())}
            inputMode="numeric"
          />
          <button
            onClick={runSingle}
            disabled={!canRunSingle || busy}
            className="btn-pill btn-pill--orange"
            title={!canRunSingle ? "Enter a valid id" : undefined}
          >
            {busy ? "Running…" : "Run single"}
          </button>
        </div>
        <p className="text-sm text-white/70">
          Calls <code>/api/admin/run-backfill?id=…</code> which generates persona + look and saves to Supabase.
        </p>
      </section>

      <section className="glass glass-pad space-y-4">
        <h2 className="text-lg font-semibold">Backfill a range</h2>
        <div className="grid grid-cols-3 gap-3">
          <input
            className="px-3 py-2 rounded-lg bg-black/30 border border-white/15"
            placeholder="from"
            value={fromId}
            onChange={(e) => setFromId(e.target.value.trim())}
            inputMode="numeric"
          />
          <input
            className="px-3 py-2 rounded-lg bg-black/30 border border-white/15"
            placeholder="to"
            value={toId}
            onChange={(e) => setToId(e.target.value.trim())}
            inputMode="numeric"
          />
          <input
            className="px-3 py-2 rounded-lg bg-black/30 border border-white/15"
            placeholder="delay ms (polite to OpenAI)"
            value={delayMs}
            onChange={(e) => setDelayMs(e.target.value.trim())}
            inputMode="numeric"
          />
        </div>
        <button
          onClick={runRange}
          disabled={!canRunRange || busy}
          className="btn-pill btn-pill--yellow"
          title={!canRunRange ? "Enter valid numbers" : undefined}
        >
          {busy ? "Running…" : "Run range"}
        </button>
        <p className="text-sm text-white/70">
          Calls <code>POST /api/admin/backfill</code> with <code>{{`{ from, to, delayMs }`}}</code>.
        </p>
      </section>

      <section className="glass glass-pad">
        <h2 className="text-lg font-semibold mb-2">Logs</h2>
        <div
          ref={logRef}
          className="h-64 overflow-auto whitespace-pre-wrap text-sm bg-black/30 rounded-lg border border-white/15 p-3"
        >
          {logs.length ? logs.join("\n") : "— no logs yet —"}
        </div>
      </section>
    </main>
  );
}
