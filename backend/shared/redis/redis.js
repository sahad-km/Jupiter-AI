import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    retryStrategy(times) {
        return Math.min(times * 200, 3000);
    }
});

redis.on("connect", () => {
    console.log("Redis connected successfully");
});

redis.on("error", (err) => {
    console.error("Redis connection error:", err.message);
});

export default redis;

