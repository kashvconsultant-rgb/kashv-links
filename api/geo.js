// Tells the chatbot which language to greet a visitor in. Plain Node, no
// dependencies: Vercel's edge network stamps every request that reaches a
// function here with the visitor's approximate location as request headers
// (x-vercel-ip-country, x-vercel-ip-country-region) — no IP lookup service,
// no database, nothing to configure. Region codes are ISO 3166-2 without the
// country prefix, e.g. "TN" for Tamil Nadu, "KA" for Karnataka.
// Never authoritative (VPNs, corporate proxies, and localhost all get this
// wrong) — used only to pick a greeting language, never anything that needs
// to be correct.

const ALLOWED_ORIGINS = [
  "https://kashvconsultancy.com",
  "https://www.kashvconsultancy.com",
  "https://kashv-links.vercel.app",
  "https://kashv-links.onrender.com"
];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async (req, res) => {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  res.status(200).json({
    ok: true,
    country: req.headers["x-vercel-ip-country"] || "",
    region: req.headers["x-vercel-ip-country-region"] || ""
  });
};
