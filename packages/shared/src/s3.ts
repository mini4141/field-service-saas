import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = () => process.env.S3_REGION ?? "ap-southeast-2";
export const bucket = () => process.env.S3_BUCKET ?? "fss-assets";

function client(endpoint?: string) {
  return new S3Client({ region: region(), endpoint, forcePathStyle: !!endpoint });
}

/** Client used for server-side reads/writes (internal endpoint in local/K8s). */
export const s3Internal = () => client(process.env.S3_ENDPOINT || undefined);
/** Client used only to sign URLs that a browser will call. */
export const s3Public = () => client(process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT || undefined);

export const presignPut = (key: string, contentType: string) =>
  getSignedUrl(s3Public(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }), { expiresIn: 600 });

export const presignGet = (key: string) =>
  getSignedUrl(s3Public(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: 600 });

export async function putObject(key: string, body: Buffer, contentType: string, s3: S3Client = s3Internal()) {
  await s3.send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }));
}
