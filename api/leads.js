// Lead capture API for the kashv-links form. Plain Node, no dependencies:
// storage is Vercel KV (Upstash Redis) called over its REST API with fetch,
// and auth for GET is a single shared password (env: ADMIN_PASSWORD), not a
// login system.

const ALLOWED_ORIGINS = [
  "https://kashvconsultancy.com",
  "https://www.kashvconsultancy.com",
  "https://kashv-links.vercel.app",
  "https://kashv-links.onrender.com"
];

const VALID_SERVICES = new Set(["consulting", "club", "tuition", "contentpilot", "kooli", "gold"]);
const LEADS_KEY = "leads";
const MAX_LEADS_RETURNED = 500;

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

async function kvCommand(command) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("KV not configured");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });
  if (!res.ok) throw new Error("KV request failed: " + res.status);
  return res.json();
}

module.exports = async (req, res) => {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    // Honeypot: bots fill hidden fields humans never see. Pretend success,
    // store nothing.
    if (body.website) {
      res.status(200).json({ ok: true });
      return;
    }

    const name = String(body.name || "").trim().slice(0, 200);
    const company = String(body.company || "").trim().slice(0, 200);
    const phone = String(body.phone || "").trim().slice(0, 40);
    const service = String(body.service || "").trim();

    if (!name || !phone || !VALID_SERVICES.has(service)) {
      res.status(400).json({ ok: false, error: "Missing or invalid fields" });
      return;
    }

    const lead = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      name: name,
      company: company,
      phone: phone,
      service: service,
      createdAt: new Date().toISOString()
    };

    try {
      await kvCommand(["LPUSH", LEADS_KEY, JSON.stringify(lead)]);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("leads POST failed:", err);
      res.status(500).json({ ok: false, error: "Storage error" });
    }
    return;
  }

  if (req.method === "GET") {
    const adminPassword = process.env.ADMIN_PASSWORD;
    const auth = req.headers.authorization || "";
    const token = auth.indexOf("Bearer ") === 0 ? auth.slice(7) : "";

    if (!adminPassword || token !== adminPassword) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    try {
      const data = await kvCommand(["LRANGE", LEADS_KEY, "0", String(MAX_LEADS_RETURNED - 1)]);
      const leads = (data.result || [])
        .map(function (raw) {
          try { return JSON.parse(raw); } catch (e) { return null; }
        })
        .filter(Boolean);
      res.status(200).json({ ok: true, leads: leads });
    } catch (err) {
      console.error("leads GET failed:", err);
      res.status(500).json({ ok: false, error: "Storage error" });
    }
    return;
  }

  if (req.method === "DELETE") {
    const adminPassword = process.env.ADMIN_PASSWORD;
    const auth = req.headers.authorization || "";
    const token = auth.indexOf("Bearer ") === 0 ? auth.slice(7) : "";

    if (!adminPassword || token !== adminPassword) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const id = (req.query && req.query.id) || "";
    if (!id) {
      res.status(400).json({ ok: false, error: "Missing id" });
      return;
    }

    try {
      const data = await kvCommand(["LRANGE", LEADS_KEY, "0", String(MAX_LEADS_RETURNED - 1)]);
      const raw = (data.result || []).find(function (item) {
        try { return JSON.parse(item).id === id; } catch (e) { return false; }
      });
      if (!raw) {
        res.status(404).json({ ok: false, error: "Not found" });
        return;
      }
      await kvCommand(["LREM", LEADS_KEY, "1", raw]);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("leads DELETE failed:", err);
      res.status(500).json({ ok: false, error: "Storage error" });
    }
    return;
  }

  res.status(405).json({ ok: false, error: "Method not allowed" });
};
