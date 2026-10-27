import "dotenv/config";
import express from "express";
import proxy from "express-http-proxy";
import cookieParser from "cookie-parser";
import cors from "cors";
import auth from "./middleware/auth.middleware.js";
import { proxyWithHeader } from "./utils/proxyWithHeader.js";
import { useRateLimiter } from "./utils/useRateLimiter.js";

const port = process.env.PORT || 8000;

const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))

app.use(cookieParser())

// Rate limiters: Auth (20 req/min), Chat (100 req/min), Agent/AI (30 req/min)
app.use("/auth", useRateLimiter(20, 60), proxy(process.env.AUTH_SERVICE))
app.use("/chat", auth, useRateLimiter(100, 60), proxyWithHeader(process.env.CHAT_SERVICE))
app.use("/agent", auth, useRateLimiter(30, 60), proxyWithHeader(process.env.AGENT_SERVICE))

app.get("/me", auth, useRateLimiter(60, 60), (req, res) => {
    res.status(200).json(req.user)
})


app.get('/', (req, res) => {
    res.json({ message: 'Jupiter AI Gateway is running' })
})

app.listen(port, () => {
    console.log(`Gateway server is running on port ${port}`);
});