import axios from "axios";

export const getMessages = async (conversationId) => {
    try {
        if (!conversationId) return [];
        const response = await axios.get(process.env.CHAT_SERVICE + "/get-messages/" + conversationId);
        const list = response.data?.messages || response.data;
        if (Array.isArray(list)) {
            return list
                .filter((m) => m && m.content)
                .map((m) => ({
                    role: m.role || "user",
                    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
                }));
        }
        return [];
    } catch (error) {
        console.error("Error fetching messages:", error?.message || error);
        return [];
    }
};