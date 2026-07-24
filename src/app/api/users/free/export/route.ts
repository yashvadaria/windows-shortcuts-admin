import { NextResponse } from "next/server";
import getClient from "@/lib/mongo";

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  try {
    const client = await getClient();
    const dbName = process.env.MONGODB_DB_NAME || "win_mac";
    const db = client.db(dbName);

    const [freeRaw, paidRaw] = await Promise.all([
      db.collection("free_users").find({}).sort({ created_at: -1 }).toArray(),
      db
        .collection("paid_users")
        .find({}, { projection: { email: 1 } })
        .toArray(),
    ]);

    const paidEmails = new Set(
      paidRaw
        .map((d) => (d.email as string | undefined)?.trim().toLowerCase())
        .filter(Boolean) as string[]
    );

    const seen = new Set<string>();
    const rows: { email: string; created_at: string }[] = [];

    for (const doc of freeRaw) {
      const email = (doc.email as string | undefined)?.trim();
      if (!email) continue;
      const key = email.toLowerCase();
      if (seen.has(key) || paidEmails.has(key)) continue;
      seen.add(key);

      const created =
        doc.created_at instanceof Date
          ? doc.created_at.toISOString()
          : String(doc.created_at ?? "");

      rows.push({ email, created_at: created });
    }

    rows.sort((a, b) =>
      a.email.localeCompare(b.email, undefined, { sensitivity: "base" })
    );

    const csv = [
      "email,created_at",
      ...rows.map(
        (r) => `${csvEscape(r.email)},${csvEscape(r.created_at)}`
      ),
    ].join("\n");

    return new NextResponse(csv + "\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="free_users_export.csv"',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Database error" },
      { status: 500 }
    );
  }
}
