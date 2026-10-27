import { PutObjectCommand } from "@aws-sdk/client-s3"
import { s3Client } from "../config/s3.js"

export const uploadToS3 = async (filename, buffer, contentType, userId = null) => {
    const key = userId && !filename.startsWith(`users/`) ? `users/${userId}/${filename}` : filename;
    await s3Client.send(
        new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        })
    );
    return key;
};