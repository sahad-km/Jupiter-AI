import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModel } from "../config/llmModels.js";
import fs from "fs/promises";
import { existsSync } from "fs";

export const imageAnalyzerAgent = async (state) => {
    try {
        const llm = await getModel("imageAnalyzer");

        const imageBuffer = await fs.readFile(state.file.path);
        const base64Image = imageBuffer.toString("base64");

        const message = [
            new SystemMessage(`You are Jupiter AI image analyzer agent.
                Rules:
                - Analyze only the uploaded image.
                - Answer the user's question accurately.
                - If text exists in the image, extract it.
                - If charts or tables exists, explain them.
                - If something is unclear, say so.
                - Use markdown when helpful.
                - Do not hallucinate.
                `
            ),
            new HumanMessage({
                content: [
                    {
                        type: "text",
                        text: state.prompt || "Analyze the image",
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:${state.file.mimetype};base64,${base64Image}`,
                        }
                    }
                ]
            })
        ];

        const response = await llm.invoke(message);

        return {
            ...state,
            aiResponse: response?.content,
        };

    } catch (err) {
        console.log(err);
        return { ...state, aiResponse: "Error in analyzing image" };
    } finally {
        if (state.file?.path && existsSync(state.file.path)) {
            await fs.unlink(state.file.path);
        }
    }
};