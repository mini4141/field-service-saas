import { createHmac } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { S3Event } from "aws-lambda";
import sharp from "sharp";

export interface Deps {
  s3: Pick<S3Client, "send">;
  fetch: typeof fetch;
}

const log = (msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: "log", service: "thumbnailer", msg, ...extra }));

export function defaultDeps(): Deps {
  const endpoint = process.env.S3_ENDPOINT || undefined;
  return {
    s3: new S3Client({ region: process.env.S3_REGION ?? process.env.AWS_REGION ?? "ap-southeast-2", endpoint, forcePathStyle: !!endpoint }),
    fetch,
  };
}

/** photos/<companyId>/<jobId>/<file> -> thumbs/<companyId>/<jobId>/<file>.jpg */
export const thumbKeyFor = (key: string) => `thumbs/${key.slice("photos/".length)}.jpg`;

/** Lambda entry point (S3 ObjectCreated under photos/). The local watcher calls this exact function. */
export async function handler(event: S3Event, deps: Deps = defaultDeps()) {
  const results: { key: string; thumbKey: string }[] = [];
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    if (!key.startsWith("photos/")) continue;

    const obj = await deps.s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const input = Buffer.from(await obj.Body!.transformToByteArray());
    const thumb = await sharp(input).rotate().resize({ width: 320, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    const thumbKey = thumbKeyFor(key);
    await deps.s3.send(new PutObjectCommand({ Bucket: bucket, Key: thumbKey, Body: thumb, ContentType: "image/jpeg" }));

    const body = JSON.stringify({ key, thumbKey });
    const signature = createHmac("sha256", process.env.INTERNAL_HMAC_SECRET ?? "dev-only-hmac").update(body).digest("hex");
    const res = await deps.fetch(`${process.env.API_WEBHOOK_URL}/api/v1/internal/photos/thumbnail-ready`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": signature },
      body,
    });
    if (!res.ok) throw new Error(`webhook failed: ${res.status}`);
    log("thumbnail created", { key, thumbKey, bytes: thumb.length });
    results.push({ key, thumbKey });
  }
  return results;
}
