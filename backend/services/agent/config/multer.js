import fs from "fs"
import path from "path"
import multer from "multer"

const uploadDir = path.resolve("./temp")

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir)
    },
    filename(req, file, cb) {
        const ext = path.extname(file.originalname || "").replace(/[^a-zA-Z0-9.]/g, "").toLowerCase();
        const base = path.basename(file.originalname || "file", ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
        const safeFilename = `${Date.now()}-${base}${ext}`;
        cb(null, safeFilename);
    }
})

const fileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf" ||
        file.mimetype.startsWith("image/")
    ) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only image or pdf are allowed"), false);
    }
}

export default multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } })