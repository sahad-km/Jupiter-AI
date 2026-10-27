import redis from "../../shared/redis/redis.js"

export const useRateLimiter = (maxRequests = 60, windowSeconds = 60) => {
    return async (req, res, next) => {
        try {
            // Key is strictly tied to verified server identity, not client IP/headers
            const key = req.user ? `ratelimit:user:${req.user.userId}` : `ratelimit:ip:${req.ip}`;
            const current = await redis.incr(key);
            if (current === 1) {
                await redis.expire(key, windowSeconds);
            }
            if (current > maxRequests) {
                return res.status(429).json({ message: "Too many requests. Please slow down." });
            }
            next();
        } catch (error) {
            next(); // Fail open if redis check fails
        }
    }
}