import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";

export const createConversation = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const conversation = await Conversation.create({
            userId: userId
        })

        return res.status(200).json({ success: true, conversation })
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: "Create Conversation Error" });
    }
}

export const getConversations = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const conversations = await Conversation.find({
            userId: userId
        }).sort({ updatedAt: -1 })

        return res.status(200).json({ success: true, conversations })
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: "Get Conversation Error" });
    }
}

export const updateConversation = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { conversationId, title } = req.body;

        const updatedConversation = await Conversation.findOneAndUpdate(
            { _id: conversationId, userId },
            { title },
            { new: true }
        );

        if (!updatedConversation) {
            return res.status(404).json({ success: false, message: "Conversation not found or unauthorized" });
        }


        return res.status(200).json({ success: true, updatedConversation })
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: "Update Conversation Error" });
    }
}


export const deleteConversation = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { conversationId } = req.params;

        const deleted = await Conversation.findOneAndDelete({ _id: conversationId, userId });
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Conversation not found or unauthorized" });
        }

        await Message.deleteMany({ conversationId });

        return res.status(200).json({ success: true })
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: "Delete Conversation Error" });
    }
}

export const saveMessage = async (req, res) => {
    try {
        const { conversationId, role, content, images, artifacts } = req.body;
        const message = await Message.create({
            conversationId,
            role,
            content,
            images: images || [],
            artifacts: artifacts || []
        });

        return res.status(200).json({ success: true, message });
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: "Save Message Error" });
    }
}

export const getMessages = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { conversationId } = req.params;

        const conversation = await Conversation.findOne({ _id: conversationId, userId });
        if (!conversation) {
            return res.status(403).json({ success: false, message: "Access denied to conversation" });
        }
        const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

        return res.status(200).json({ success: true, messages });
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: "Get Messages Error" });
    }
}