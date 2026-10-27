import { HumanMessage } from "@langchain/core/messages";
import { getModel } from "../config/llmModels.js";
import { checkAgentLimit } from "../config/agentLimit.js";

export const router = async (state) => {
    let targetAgent = state.agent;

    if (!targetAgent || targetAgent === "auto") {
        if (state.file?.mimetype === "application/pdf") {
            targetAgent = "pdfRag";
        } else if (state.file?.mimetype?.startsWith("image/")) {
            targetAgent = "imageAnalyzer";
        } else {
            const llm = await getModel("router");
            const prompt = `You are a router that directs queries to the correct agent.
Analyze the user's query and choose one of the following agents:
- chat
- coding
- search
- vision
- pdf
- ppt

Rules:
chat: General conversation, explanations, learning, questions.
coding: generate code, debug code, build projects, architecture, API design.
search: web search, information retrieval, research.
vision: image analysis, image generation, image editing.
pdf: pdf analysis, pdf generation, pdf editing.
ppt: ppt generation, ppt analysis, ppt editing.

Return ONLY the single agent name word (e.g. "chat" or "coding").

Query: ${state.prompt}`;

            const response = await llm.invoke([new HumanMessage(prompt)]);

            const rawAgent = response?.content?.toString().trim().toLowerCase() || "chat";
            const validAgents = ["chat", "coding", "search", "vision", "pdf", "ppt"];
            targetAgent = validAgents.find((a) => rawAgent.includes(a)) || "chat";
        }
    }

    if (state.userId) {
        await checkAgentLimit(state.userId, targetAgent);
    }

    return {
        ...state,
        agent: targetAgent,
    };
};