import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import type { S3Event } from "aws-lambda";
import { defaultDeps, handler } from "./handler";

/** Local stand-in for the S3 -> Lambda event: polls moto and runs the very same handler. */
const bucket = process.env.S3_BUCKET ?? "fss-assets";
const deps = defaultDeps();
const seen = new Set<string>();

async function tick() {
  const list = await deps.s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "photos/" }));
  for (const obj of list.Contents ?? []) {
    if (!obj.Key || seen.has(obj.Key)) continue;
    seen.add(obj.Key);
    const event = { Records: [{ s3: { bucket: { name: bucket }, object: { key: encodeURIComponent(obj.Key) } } }] } as unknown as S3Event;
    try {
      await handler(event, deps);
    } catch (e) {
      seen.delete(obj.Key); // retry on next tick (e.g. API not up yet)
      console.error(JSON.stringify({ level: "error", service: "thumbnailer-watcher", key: obj.Key, msg: String(e) }));
    }
  }
}

console.log(JSON.stringify({ level: "log", service: "thumbnailer-watcher", msg: `watching s3://${bucket}/photos/` }));
setInterval(() => tick().catch((e) => console.error(String(e))), 2000);
