import axios from "axios";
import { graph } from "../graph/graph.js";
import { addMessageToMemory } from "../config/memory.js";
import { checkAgentLimit } from "../config/agentLimit.js";

export const agent = async (req, res, next) => {
    try {
        const { prompt, conversationId, agent: selectedAgent } = req.body;
        const userId = req.headers["x-user-id"] || req.user?.userId || req.user?._id || req.body.userId;
        const file = req.file;

        // 1. Check per-agent limit if an explicit agent is chosen
        if (selectedAgent && selectedAgent !== "auto" && userId) {
            await checkAgentLimit(userId, selectedAgent);
        }

        // 2. Set SSE Headers
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        if (typeof res.flushHeaders === "function") {
            res.flushHeaders();
        }

        // 3. Save User Message to Memory & DB asynchronously
        if (conversationId && prompt) {
            await addMessageToMemory(conversationId, "user", prompt);
            axios.post(process.env.CHAT_SERVICE + "/save-message", {
                conversationId, role: "user", content: prompt
            }).catch((err) => console.error("Error saving user message:", err.message));
        }

        // 4. Stream Graph Events in Real-Time
        let accumulatedText = "";
        let finalState = null;
        let resolvedAgent = selectedAgent || "auto";

        const eventStream = await graph.streamEvents(
            {
                prompt,
                conversationId,
                agent: selectedAgent || "auto",
                file,
                userId
            },
            { version: "v2" }
        );

        for await (const event of eventStream) {
            // Node switch / router resolution -> verify quota for auto-detected agent
            if (event.event === "on_chain_end" && event.name === "router" && event.data?.output?.agent) {
                resolvedAgent = event.data.output.agent;
                if ((!selectedAgent || selectedAgent === "auto") && userId) {
                    await checkAgentLimit(userId, resolvedAgent);
                }
                res.write(`data: ${JSON.stringify({ type: "agent", agent: resolvedAgent })}\n\n`);
            }
            if (event.event === "on_chain_start") {
                const node = event.metadata?.langgraph_node || event.name;
                const statusMap = {
                    search: "Searching the web...",
                    pdfRag: "Retrieving & analyzing PDF document...",
                    imageAnalyzer: "Scanning & analyzing image...",
                    coding: "Generating code solution...",
                    vision: "Generating AI visuals...",
                    pdf: "Compiling formatted PDF...",
                    ppt: "Designing presentation slides...",
                    chat: "Formulating response...",
                };
                if (statusMap[node]) {
                    res.write(`data: ${JSON.stringify({ type: "status", status: statusMap[node], node })}\n\n`);
                }
            }

            // Tool Execution (e.g. Tavily search tool)
            if (event.event === "on_tool_start") {
                const query = event.data?.input?.query || (typeof event.data?.input === "string" ? event.data.input : "");
                const statusText = query ? `Searching web for "${query}"...` : `Running ${event.name}...`;
                res.write(`data: ${JSON.stringify({ type: "status", status: statusText, tool: event.name })}\n\n`);
            }

            if (event.event === "on_tool_end") {
                res.write(`data: ${JSON.stringify({ type: "status", status: "Synthesizing answer from web sources..." })}\n\n`);
            }

            // Stream real-time tokens from active agent (filter out internal router classification tokens)
            if (
                event.event === "on_chat_model_stream" &&
                event.metadata?.langgraph_node !== "router" &&
                event.metadata?.langgraph_node !== "intent"
            ) {
                const chunk = event.data?.chunk?.content;
                if (chunk && typeof chunk === "string") {
                    accumulatedText += chunk;
                    res.write(`data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`);
                }
            }

            // Track state updates from agent nodes
            if (event.event === "on_chain_end" && event.data?.output && typeof event.data.output === "object") {
                if ("aiResponse" in event.data.output || "artifacts" in event.data.output || "images" in event.data.output) {
                    finalState = { ...(finalState || {}), ...event.data.output };
                }
            }
        }

        const finalResponse = finalState?.aiResponse || accumulatedText;
        const finalImages = finalState?.images || [];
        const finalArtifacts = finalState?.artifacts || [];
        const finalAgentName = finalState?.agent || resolvedAgent;

        // 4. Save complete Assistant response to Memory & Chat DB
        if (conversationId && finalResponse) {
            await addMessageToMemory(conversationId, "assistant", finalResponse);
            await axios.post(process.env.CHAT_SERVICE + "/save-message", {
                conversationId,
                role: "assistant",
                content: finalResponse,
                images: finalImages,
                artifacts: finalArtifacts,
            }).catch((err) => console.error("Error saving assistant message:", err.message));
        }

        // 5. Send terminal 'done' SSE packet
        res.write(`data: ${JSON.stringify({
            type: "done",
            response: finalResponse,
            agent: finalAgentName,
            images: finalImages,
            artifacts: finalArtifacts
        })}\n\n`);

        res.end();
    } catch (error) {
        console.error("Agent streaming error:", error);
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({
                type: "error",
                message: error.data?.message || error.message || "An error occurred during generation",
                status: error.status || 500,
                data: error.data || null
            })}\n\n`);
            res.end();
        } else {
            next(error);
        }
    }
};