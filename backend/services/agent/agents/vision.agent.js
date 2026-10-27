import { getModel } from "../config/llmModels.js";
import axios from "axios";
import { uploadToS3 } from '../utils/uploadToS3.js';
import { getFromS3 } from '../utils/getFromS3.js';

export const visionAgent = async (state) => {

    try {
        const llm = await getModel("vision");
        const res = await llm.invoke(`
        You are an elite AI image prompt engineer.

        Convert the user request into a highly detailed image generation prompt.

        Requirements:

        - Cinematic lighting
        - Professional compositions
        - Ultra realistic
        - High detail
        - Beautiful color palette
        - Sharp focus
        - 8K quality
        - Photorealistic
        - Depth of field
        - Professional Photgraphy
        - Natural colors
        - Stunning visuals

        Return only the image prompt.

        User request: ${state.prompt}
    `)

        const prompt = res.content.trim();
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });

        const buffer = Buffer.from(imageResponse.data);

        const filename = `image-${Date.now()}.png`;

        const s3Key = await uploadToS3(filename, buffer, 'image/png', state.userId);

        const downloadUrl = await getFromS3(s3Key, 24 * 60 * 60, state.userId)

        return {
            ...state,
            images: [downloadUrl],
            aiResponse: `### ✨ Image Generated Successfully

![Generated Image](${downloadUrl})

[⬇️ Download Image](${downloadUrl})

> **Note:** This image link will expire in 24 hours. Please download the image before the link expires.`,
        };
    } catch (err) {
        console.log(err)
        return {
            ...state,
            aiResponse: "Error generating image. Please try again.",
        };
    }
};