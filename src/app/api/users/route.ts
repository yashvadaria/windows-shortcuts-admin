import { NextResponse } from "next/server";
import getClient from "@/lib/mongo";

const FREE = "free_users";
const PAID = "paid_users";

function serialize(doc: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...doc };
  if (out._id) out._id = String(out._id);
  if (out.created_at instanceof Date) {
    out.created_at = out.created_at.toISOString();
  }
  return out;
}

export async function GET() {
  try {
    const client = await getClient();
    const dbName = process.env.MONGODB_DB_NAME || "win_mac";
    const db = client.db(dbName);

    const [freeRaw, paidRaw] = await Promise.all([
      db.collection(FREE).find({}).sort({ created_at: -1 }).limit(5000).toArray(),
      db.collection(PAID).find({}).sort({ created_at: -1 }).limit(5000).toArray(),
    ]);

    const free_users = freeRaw.map((d) => serialize(d as Record<string, unknown>));
    const paid_users = paidRaw.map((d) => serialize(d as Record<string, unknown>));

    return NextResponse.json({ free_users, paid_users });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Database error" },
      { status: 500 }
    );
  }
}
