const buckets = new Map();

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

export function createIpRateLimiter({
  windowMs = 60_000,
  max = 30,
  message = 'Too many requests. Please try again shortly.',
  publicOnly = false,
} = {}) {
  return (req, res, next) => {
    if (publicOnly && req.session?.user) {
      return next();
    }

    const now = Date.now();
    const key = getClientIp(req);
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (existing.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        error: { message },
      });
    }

    existing.count += 1;
    return next();
  };
}
