import { MongoClient, ServerApiVersion } from "mongodb";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional fallback env file
  }
}

loadEnvFile(join(__dirname, "..", ".env"));
loadEnvFile(join(__dirname, "..", "..", "win-mac-backend", ".env"));

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "win_mac";
const outPath =
  process.argv[2] || join(__dirname, "..", "free_users_export.csv");

if (!uri) {
  console.error("Missing MONGODB_URI (set in .env or win-mac-backend/.env)");
  process.exit(1);
}

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const client = new MongoClient(uri, options);

try {
  await client.connect();
  const db = client.db(dbName);

  const [freeRaw, paidRaw] = await Promise.all([
    db.collection("free_users").find({}).sort({ created_at: -1 }).toArray(),
    db.collection("paid_users").find({}, { projection: { email: 1 } }).toArray(),
  ]);

  const paidEmails = new Set(
    paidRaw
      .map((d) => (d.email || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const seen = new Set();
  const rows = [];

  for (const doc of freeRaw) {
    const email = (doc.email || "").trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key) || paidEmails.has(key)) continue;
    seen.add(key);

    const created =
      doc.created_at instanceof Date
        ? doc.created_at.toISOString()
        : doc.created_at || "";

    rows.push({ email, created_at: created });
  }

  rows.sort((a, b) => a.email.localeCompare(b.email, undefined, { sensitivity: "base" }));

  const lines = [
    "email,created_at",
    ...rows.map((r) => `${csvEscape(r.email)},${csvEscape(r.created_at)}`),
  ];

  writeFileSync(outPath, lines.join("\n") + "\n", "utf8");

  console.log(`Exported ${rows.length} free-tier emails to ${outPath}`);
  console.log(
    `Source: ${freeRaw.length} free_users docs, ${paidEmails.size} paid emails excluded`
  );
} finally {
  await client.close();
}
