import redis from '../../../shared/redis/redis.js';
import { getMessages } from '../utils/getMessages.js';

export const getMemory = async (conversationId) => {
    try {
        if (!conversationId) return [];
        const key = `messages-${conversationId}`;
        const cached = await redis.get(key);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) {
                    return parsed.filter((m) => m && typeof m.content === "string");
                }
            } catch (e) {
                // If corrupted, fallback to DB
            }
        }

        const messages = await getMessages(conversationId);
        const validMessages = Array.isArray(messages)
            ? messages.filter((m) => m && typeof m.content === "string")
            : [];

        await saveMemory(conversationId, validMessages);
        return validMessages;
    } catch (error) {
        console.error("Error in getMemory:", error);
        return [];
    }
};

const saveMemory = async (conversationId, messages) => {
    try {
        if (!conversationId) return;
        const key = `messages-${conversationId}`;
        await redis.set(key, JSON.stringify(messages), "EX", 24 * 60 * 60);
    } catch (error) {
        console.error("Error saving memory to Redis:", error);
    }
};

export const addMessageToMemory = async (conversationId, role, content) => {
    try {
        if (!conversationId || !content) return;
        const key = `messages-${conversationId}`;
        const rawMessages = await redis.get(key);
        let messages = [];
        if (rawMessages) {
            try {
                const parsed = JSON.parse(rawMessages);
                if (Array.isArray(parsed)) messages = parsed;
            } catch (e) {
                messages = [];
            }
        }
        messages.push({ role: role || "user", content: String(content) });
        if (messages.length > 20) {
            messages.shift();
        }
        await redis.set(key, JSON.stringify(messages), "EX", 24 * 60 * 60);
    } catch (error) {
        console.error("Error in addMessageToMemory:", error);
    }
};