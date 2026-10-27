import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import serviceAccount from "../serviceAccountKey.json" with { type: "json" };

export const app = getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount)
    })
    : getApp();
