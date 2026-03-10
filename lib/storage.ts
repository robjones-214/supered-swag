import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import axios from "axios";

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return r2Client;
}

export async function uploadImageFromUrl(
  tempUrl: string,
  brandName: string,
  uniqueId: string
): Promise<string> {
  const imgResponse = await axios.get(tempUrl, { responseType: "arraybuffer" });

  const brandSlug = brandName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 30);

  const filename = `${brandSlug}-${Date.now()}-${uniqueId}.jpg`;

  const r2 = getR2Client();
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: filename,
      Body: Buffer.from(imgResponse.data as ArrayBuffer),
      ContentType: "image/jpeg",
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${filename}`;
}
