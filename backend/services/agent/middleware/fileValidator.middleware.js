import { fileTypeFromFile } from "file-type";
import fs from "fs";
import redis from "../../../shared/redis/redis.js";

const MAX_DAILY_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB per user per day
const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
];

export const validateFileSecurity = async (req, res, next) => {
    if (!req.file) {
        return next();
    }

    const filePath = req.file.path;
    const userId = req.headers["x-user-id"] || "anonymous";

    try {
        // 1. Verify actual file signature / magic bytes (prevents MIME-spoofing)
        const detectedType = await fileTypeFromFile(filePath);
        
        if (!detectedType || !ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            return res.status(400).json({
                success: false,
                message: "Security check failed: File content does not match allowed types (PDF, PNG, JPEG, WEBP)."
            });
        }

        // 2. Validate PDF page count (limit to 50 pages to prevent memory exhaustion)
        if (detectedType.mime === "application/pdf") {
            try {
                const { PDFParse } = await import("pdf-parse");
                const buffer = fs.readFileSync(filePath);
                const parsed = await new PDFParse({ data: buffer });
                const numPages = parsed.numpages || (parsed.pages ? parsed.pages.length : 0);
                if (numPages > 50) {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    return res.status(400).json({
                        success: false,
                        message: `PDF page limit exceeded: Uploaded PDF has ${numPages} pages (maximum allowed is 50 pages).`
                    });
                }
            } catch (pdfErr) {
                console.warn("PDF page count check warning:", pdfErr.message);
            }
        }

        // 3. Enforce per-user daily upload quota in Redis
        const todayKey = new Date().toISOString().slice(0, 10);
        const quotaKey = `quota:uploads:${userId}:${todayKey}`;
        const totalUsed = await redis.incrby(quotaKey, req.file.size);

        if (totalUsed === req.file.size) {
            await redis.expire(quotaKey, 86400); // Expire after 24 hours
        }

        if (totalUsed > MAX_DAILY_UPLOAD_BYTES) {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            return res.status(429).json({
                success: false,
                message: "Upload quota exceeded: You have reached the daily 50MB file upload limit."
            });
        }

        // Attach verified mime type to file object
        req.file.verifiedMimeType = detectedType.mime;
        next();
    } catch (err) {
        console.error("File validation error:", err);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return res.status(500).json({
            success: false,
            message: "Internal error validating uploaded file security."
        });
    }
};
