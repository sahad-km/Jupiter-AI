import { getAuth } from "firebase-admin/auth";
import crypto from "crypto";
import { app } from "../config/firebase.js";
import User from "../models/user.model.js";
import redis from "../../../shared/redis/redis.js";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
};

export const login = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: "ID Token is required" });
        }

        let decoded;
        try {
            decoded = await getAuth(app).verifyIdToken(token);
        } catch (authErr) {
            console.error("Token verification failed:", authErr.message);
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        let user = await User.findOne({ firebaseUid: decoded.uid });

        const name = decoded.name || (decoded.email ? decoded.email.split("@")[0] : "User");
        const avatar = decoded.picture || "";

        if (!user) {
            user = await User.create({
                firebaseUid: decoded.uid,
                name,
                email: decoded.email,
                avatar
            });
        } else {
            let updated = false;
            if (decoded.name && user.name !== decoded.name) {
                user.name = decoded.name;
                updated = true;
            }
            if (decoded.picture && user.avatar !== decoded.picture) {
                user.avatar = decoded.picture;
                updated = true;
            }
            if (updated) {
                await user.save();
            }
        }

        const sessionId = crypto.randomUUID();
        await redis.set(`session-${sessionId}`, JSON.stringify({
            userId: user._id.toString(),
            name: user.name,
            email: user.email,
            avatar: user.avatar
        }), "EX", 7 * 24 * 60 * 60);

        res.cookie("session", sessionId, COOKIE_OPTIONS);

        return res.status(200).json({
            userId: user._id.toString(),
            name: user.name,
            email: user.email,
            avatar: user.avatar
        });

    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const logout = async (req, res) => {
    try {
        const sessionId = req.cookies?.session;
        if (sessionId) {
            await redis.del(`session-${sessionId}`);
        }
        res.clearCookie("session", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/"
        });
        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}