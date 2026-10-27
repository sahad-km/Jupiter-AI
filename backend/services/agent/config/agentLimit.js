import redis from "../../../shared/redis/redis.js";

const Limits = {
    chat: 20,
    coding: 5,
    search: 5,
    vision: 5,
    pdf: 5,
    ppt: 5,
    pdfRag: 5,
    imageAnalyzer: 5
}

export const checkAgentLimit = async (userId, agent) => {
    const max = Limits[agent] || 10;
    const key = `rate:${userId}:${agent}`;
    const count = await redis.incr(key);
    if (count === 1) {
        await redis.expire(key, 60);
    }
    const ttl = await redis.ttl(key)

    if (count > max) {
        const minutes = Math.floor(ttl / 60);
        const seconds = ttl % 60;
        const time = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        const error = new Error(`Rate limit exceeded for ${agent}`);
        error.status = 429;
        error.data = {
            success: false,
            agent,
            limit: max,
            remainingTime: ttl,
            retryAfter: time,
            message: `Rate limit reached for ${agent} (${max}/min). Try again in ${time}.`
        };
        throw error;
    }

    return {
        remaining: max - count,
        limit: max
    }
}