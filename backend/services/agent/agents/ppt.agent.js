import { getModel } from "../config/llmModels.js";
import { generatePpt } from "../utils/generatePpt.js";
import { uploadToS3 } from '../utils/uploadToS3.js';
import { getFromS3 } from '../utils/getFromS3.js';


export const pptAgent = async (state) => {
    try {
        const llm = await getModel("ppt");
        const prompt = `
        You are a professional presentation designer.

        Return ONLY valid JSON.

        Format:
        {
            "title": "",
            "subtitle": "",
            "slides": [
                {
                    "title": "",
                    "points": [
                        "",
                        "",
                        "",
                        ""
                    ]
                }
            ]
        }

        Rules: 
        - Generate exactly 6 content slides.
        - Each slide should have 4-6 concise bullet points.
        - No markdown
        - No explanation
        - No code block
        - Return ONLY JSON
        
        Topic: ${state.prompt}`

        const response = await llm.invoke(prompt);

        const data = JSON.parse(response.content);
        const buffer = await generatePpt(data);
        const filename = `ppt-${Date.now()}.pptx`;
        const s3Key = await uploadToS3(filename, buffer, "application/vnd.openxmlformats-officedocument.presentationml.presentation", state.userId);
        const downloadUrl = await getFromS3(s3Key, 24 * 60 * 60, state.userId);

        return {
            ...state,
            images: [downloadUrl],
            aiResponse: `### ✨ Presentation Generated Successfully

**${data.title}**
${data.subtitle ? `*${data.subtitle}*\n` : ''}
[⬇️ Download Presentation](${downloadUrl})

> **Note:** This Presentation link will expire in 24 hours. Please download the Presentation before the link expires.`,
        };
    } catch (err) {
        console.log(err)
        return {
            ...state,
            aiResponse: "Error generating PPT. Please try again.",
        };
    }

};