import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client, getBucketConfig } from "./aws-config";

export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic: boolean = false,
) {
  const s3 = createS3Client();
  const { bucketName, folderPrefix } = getBucketConfig();
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = isPublic
    ? `${folderPrefix}public/uploads/${timestamp}-${safeName}`
    : `${folderPrefix}uploads/${timestamp}-${safeName}`;
  const cmd = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    ContentDisposition: isPublic ? "attachment" : undefined,
  });
  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
  return { uploadUrl, cloud_storage_path: key };
}

export async function getFileUrl(cloud_storage_path: string, isPublic: boolean = false) {
  const { bucketName } = getBucketConfig();
  if (isPublic) {
    const region = process.env.AWS_REGION ?? "us-east-1";
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  }
  const s3 = createS3Client();
  const cmd = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ResponseContentDisposition: "attachment",
  });
  return await getSignedUrl(s3, cmd, { expiresIn: 3600 });
}

export async function getInlineFileUrl(cloud_storage_path: string) {
  const { bucketName } = getBucketConfig();
  const s3 = createS3Client();
  const cmd = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
  });
  return await getSignedUrl(s3, cmd, { expiresIn: 3600 });
}

export async function deleteFile(cloud_storage_path: string) {
  const s3 = createS3Client();
  const { bucketName } = getBucketConfig();
  await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: cloud_storage_path }));
}
