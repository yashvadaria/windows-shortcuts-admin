"use client";

import { useCallback, useEffect, useState } from "react";

type FreeUser = {
  _id: string;
  email?: string;
  created_at?: string;
};

type PaidUser = {
  _id: string;
  email?: string;
  activation_code?: string;
  created_at?: string;
  stripe_session_id?: string;
  stripe_payment_id?: string;
};

function formatDate(iso?: string) {
  if (!iso) return ",";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function Home() {
  const [freeUsers, setFreeUsers] = useState<FreeUser[]>([]);
  const [paidUsers, setPaidUsers] = useState<PaidUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      setFreeUsers(data.free_users || []);
      setPaidUsers(data.paid_users || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function exportFreeCsv() {
    setError(null);
    try {
      const res = await fetch("/api/users/free/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "free_users_export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Winkeys Admin</h1>
          <p className="text-xs text-zinc-500">
            {freeUsers.length} free · {paidUsers.length} paid
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-10">
        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-4">
            Paid users
          </h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  <th className="px-4 py-3 font-medium text-zinc-400">Email</th>
                  <th className="px-4 py-3 font-medium text-zinc-400">Activation code</th>
                  <th className="px-4 py-3 font-medium text-zinc-400">Joined</th>
                  <th className="px-4 py-3 font-medium text-zinc-400 hidden md:table-cell">
                    Stripe session
                  </th>
                </tr>
              </thead>
              <tbody>
                {paidUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      No paid users yet.
                    </td>
                  </tr>
                )}
                {paidUsers.map((u) => (
                  <tr key={u._id} className="border-b border-zinc-800/80 hover:bg-zinc-900/40">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-200">{u.email || ","}</td>
                    <td className="px-4 py-3 font-mono text-xs text-emerald-400/90">
                      {u.activation_code || ","}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-500 hidden md:table-cell max-w-xs truncate">
                      {u.stripe_session_id || ","}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Free download signups
            </h2>
            <button
              type="button"
              onClick={exportFreeCsv}
              disabled={loading}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-800 disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  <th className="px-4 py-3 font-medium text-zinc-400">Email</th>
                  <th className="px-4 py-3 font-medium text-zinc-400">Joined</th>
                </tr>
              </thead>
              <tbody>
                {freeUsers.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-zinc-500">
                      No free signups yet.
                    </td>
                  </tr>
                )}
                {freeUsers.map((u) => (
                  <tr key={u._id} className="border-b border-zinc-800/80 hover:bg-zinc-900/40">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-200">{u.email || ","}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
