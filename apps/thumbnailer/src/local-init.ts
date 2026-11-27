import { CreateBucketCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

/** Creates the local (moto) bucket and the CORS rule that browser presigned PUTs need. */
const bucket = process.env.S3_BUCKET ?? "fss-assets";
const endpoint = process.env.S3_ENDPOINT || "http://localhost:5000";
const s3 = new S3Client({ region: process.env.S3_REGION ?? "ap-southeast-2", endpoint, forcePathStyle: true });

async function main() {
  await s3.send(new CreateBucketCommand({ Bucket: bucket, CreateBucketConfiguration: { LocationConstraint: "ap-southeast-2" } })).catch((e) => {
    if (!/BucketAlreadyOwnedByYou|BucketAlreadyExists/.test(String(e))) throw e;
  });
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: { CORSRules: [{ AllowedMethods: ["GET", "PUT", "HEAD"], AllowedOrigins: ["*"], AllowedHeaders: ["*"], ExposeHeaders: ["ETag"] }] },
    }),
  );
  console.log(`bucket ${bucket} ready at ${endpoint}`);
}

main();
