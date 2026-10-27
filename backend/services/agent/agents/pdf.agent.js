import { getModel } from "../config/llmModels.js";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { generatePdf } from "../utils/generatePdf.js";
import { getFromS3 } from '../utils/getFromS3.js';

export const pdfAgent = async (state) => {

    try {
        const llm = await getModel("pdf");
        const prompt = `You are an expert document writer.

    Return only valid JSON.

    Do NOT return markdown.

    Do NOT return explanations.

    Structure:
    {
        "title": "",
        "subtitle": "",
        "sections": [
            {
                "heading": "",
                "points": []
            }
        ]
    }

    Generate 4-8 sections.

    Each section should have 3-6 concise bullet points.

    Topic: ${state.prompt}`

        const response = await llm.invoke(prompt);
        const data = JSON.parse(response.content)
        const pdfBuffer = await generatePdf(data)
        const filename = `pdf-${Date.now()}.pdf`
        const s3Key = await uploadToS3(filename, pdfBuffer, "application/pdf", state.userId);
        const downloadUrl = await getFromS3(s3Key, 24 * 60 * 60, state.userId)
        return {
            ...state,
            images: [downloadUrl],
            aiResponse: `### ✨ PDF Generated Successfully

**${data.title}**
${data.subtitle ? `*${data.subtitle}*\n` : ''}
[⬇️ Download PDF](${downloadUrl})

> **Note:** This PDF link will expire in 24 hours. Please download the PDF before the link expires.`,
        };
    } catch (err) {
        console.log("pdf gen Error: ", err);
        return {
            ...state,
            aiResponse: "Unable to generate PDF",
        };
    }

};