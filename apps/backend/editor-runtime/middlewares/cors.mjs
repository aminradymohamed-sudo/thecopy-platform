/**
 * @description وسيط CORS للخادم الخلفي
 */

const PRODUCTION_ALLOWED_ORIGINS = new Set([
  "https://www.thecopy.app",
  "https://thecopy.app",
]);

const DEV_ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost(?::\d+)?$/iu,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/iu,
];

const isOriginAllowed = (origin) => {
  if (!origin) return false;
  if (PRODUCTION_ALLOWED_ORIGINS.has(origin)) return true;
  if (process.env.NODE_ENV !== "production") {
    return DEV_ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin));
  }
  return false;
};

export const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  if (isOriginAllowed(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  } else if (req.method === "OPTIONS") {
    res.sendStatus(403);
    return;
  }

  res.header("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
  } else {
    next();
  }
};
