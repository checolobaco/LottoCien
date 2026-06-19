import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Configure R2 Client using standard S3 compatibility credentials
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET || "cloudtickets-receipts";
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || "https://proof.cloud-tickets.com";

// Initialize S3Client only if R2 credentials are provided
const s3Client = 
  R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
    ? new S3Client({
        endpoint: R2_ENDPOINT,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
        region: "auto", // Cloudflare R2 standard region
      })
    : null;

export async function uploadReceiptToR2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  if (!s3Client) {
    console.warn("Credenciales de Cloudflare R2 no configuradas. Retornando mock local URL.");
    // In dev, return a placeholder/mock URL if R2 credentials aren't provided yet
    return `https://mock.receipts-r2.local/${fileName}`;
  }

  const uniqueFileName = `${Date.now()}-${fileName.replace(/\s+/g, "_")}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: uniqueFileName,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return the public access URL
  return `${R2_PUBLIC_BASE_URL}/${uniqueFileName}`;
}
