import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { s3Client } from "../config/s3.js"

export const getFromS3 = async (filename, expireIn = 600, requestingUserId = null) => {
    // If the file is stored under a user directory (users/{ownerId}/...), verify ownership
    if (filename.startsWith("users/") && requestingUserId) {
        const fileOwnerId = filename.split("/")[1];
        if (fileOwnerId && fileOwnerId !== String(requestingUserId)) {
            throw new Error("Forbidden: Access denied to other user's file");
        }
    }

    return await getSignedUrl(
        s3Client,
        new GetObjectCommand({
            Key: filename,
            Bucket: process.env.AWS_S3_BUCKET_NAME
        }),
        { expiresIn: expireIn }
    );
};