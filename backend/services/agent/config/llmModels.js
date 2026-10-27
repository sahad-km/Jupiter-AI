import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenRouter } from "@langchain/openrouter";

const openrouter = new ChatOpenRouter({
    model: "deepseek/deepseek-chat",
    temperature: 0,
    maxTokens: 2500,
    apiKey: process.env.OPENROUTER_API_KEY
});

const groq = new ChatGroq({
    model: "openai/gpt-oss-120b",
    apiKey: process.env.GROQ_API_KEY
});

const gemini = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    apiKey: process.env.GOOGLE_API_KEY
});

export const getModel = async (agent) => {
    switch (agent) {
        case "chat":
        case "search":
        case "router":
        case "pdfRag":
        case "pdf-Rag":
            return groq;
        case "vision":
        case "coding":
            return openrouter;
        case "imageAnalyzer":
            return gemini;
        case "pdf":
        case "ppt":
            return groq;
        default:
            return groq;
    }
};