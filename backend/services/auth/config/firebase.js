import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localKeyPath = path.resolve(__dirname, "../serviceAccountKey.json");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
        serviceAccount = raw.startsWith("{")
            ? JSON.parse(raw)
            : JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    } catch (err) {
        throw new Error("Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable: " + err.message);
    }
} else if (fs.existsSync(localKeyPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, "utf-8"));
} else {
    throw new Error(
        "Firebase credentials not found. Provide FIREBASE_SERVICE_ACCOUNT environment variable in production or place serviceAccountKey.json in backend/services/auth for local development."
    );
}

export const app = getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount)
    })
    : getApp();
