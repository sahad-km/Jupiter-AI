import express from "express";
import { agent } from "../controllers/agent.controller.js";
import multer from "../config/multer.js";
import { validateFileSecurity } from "../middleware/fileValidator.middleware.js";

const router = express.Router();

router.post("/chat", multer.single("file"), validateFileSecurity, agent);

export default router;