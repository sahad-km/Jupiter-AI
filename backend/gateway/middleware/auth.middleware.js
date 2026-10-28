import redis from "../../shared/redis/redis.js";

const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const bearerToken = authHeader && authHeader.startsWith("Bearer ")
            ? authHeader.slice(7).trim()
            : null;

        // Support both HTTP-only cookie and Authorization Bearer header
        const token = req.cookies?.session || bearerToken;

        if (!token) {
            return res.status(401).json({ message: "Unauthorized: No session provided" });
        }

        const sessionData = await redis.get(`session-${token}`);

        if (!sessionData) {
            return res.status(401).json({ message: "Unauthorized: Invalid or expired session" });
        }

        req.user = JSON.parse(sessionData);
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export default auth;