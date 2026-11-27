"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/handler.ts
var handler_exports = {};
__export(handler_exports, {
  defaultDeps: () => defaultDeps,
  handler: () => handler,
  processEvent: () => processEvent,
  thumbKeyFor: () => thumbKeyFor
});
module.exports = __toCommonJS(handler_exports);
var import_node_crypto = require("node:crypto");
var import_client_s3 = require("@aws-sdk/client-s3");
var import_sharp = __toESM(require("sharp"));
var log = (msg, extra = {}) => console.log(JSON.stringify({ ts: (/* @__PURE__ */ new Date()).toISOString(), level: "log", service: "thumbnailer", msg, ...extra }));
function defaultDeps() {
  const endpoint = process.env.S3_ENDPOINT || void 0;
  return {
    s3: new import_client_s3.S3Client({ region: process.env.S3_REGION ?? process.env.AWS_REGION ?? "ap-southeast-2", endpoint, forcePathStyle: !!endpoint }),
    fetch
  };
}
var thumbKeyFor = (key) => `thumbs/${key.slice("photos/".length)}.jpg`;
async function processEvent(event, deps) {
  const results = [];
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    if (!key.startsWith("photos/")) continue;
    const obj = await deps.s3.send(new import_client_s3.GetObjectCommand({ Bucket: bucket, Key: key }));
    const input = Buffer.from(await obj.Body.transformToByteArray());
    const thumb = await (0, import_sharp.default)(input).rotate().resize({ width: 320, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    const thumbKey = thumbKeyFor(key);
    await deps.s3.send(new import_client_s3.PutObjectCommand({ Bucket: bucket, Key: thumbKey, Body: thumb, ContentType: "image/jpeg" }));
    const body = JSON.stringify({ key, thumbKey });
    const signature = (0, import_node_crypto.createHmac)("sha256", process.env.INTERNAL_HMAC_SECRET ?? "dev-only-hmac").update(body).digest("hex");
    const res = await deps.fetch(`${process.env.API_WEBHOOK_URL}/api/v1/internal/photos/thumbnail-ready`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": signature },
      body
    });
    if (!res.ok) throw new Error(`webhook failed: ${res.status}`);
    log("thumbnail created", { key, thumbKey, bytes: thumb.length });
    results.push({ key, thumbKey });
  }
  return results;
}
var handler = (event) => processEvent(event, defaultDeps());
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  defaultDeps,
  handler,
  processEvent,
  thumbKeyFor
});
