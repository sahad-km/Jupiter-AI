import express from "express";
import {
    createConversation,
    getConversations,
    updateConversation,
    saveMessage,
    getMessages,
    deleteConversation
} from "../controllers/chat.controllers.js";

const router = express.Router();

router.get("/create-conversation", createConversation);
router.get("/get-conversations", getConversations);
router.post("/update-conversation", updateConversation);
router.get("/delete-conversation/:conversationId", deleteConversation)
router.post("/save-message", saveMessage);
router.get("/get-messages/:conversationId", getMessages);

export default router;
