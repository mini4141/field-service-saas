import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { processEvent } from "./handler";

describe("thumbnailer handler", () => {
  it("resizes a fixture image to 320px, writes thumbs/ and calls the signed webhook", async () => {
    const fixture = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#3b82f6" } }).png().toBuffer();
    const puts: { Key: string; Body: Buffer }[] = [];
    const s3 = {
      send: vi.fn(async (cmd: unknown) => {
        if (cmd instanceof GetObjectCommand) return { Body: { transformToByteArray: async () => new Uint8Array(fixture) } };
        if (cmd instanceof PutObjectCommand) puts.push(cmd.input as { Key: string; Body: Buffer });
        return {};
      }),
    };
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    process.env.API_WEBHOOK_URL = "http://api.test";

    const event = { Records: [{ s3: { bucket: { name: "b" }, object: { key: "photos/co1/job1/a+photo.png" } } }] };
    const out = await processEvent(event as never, { s3: s3 as never, fetch: fetchMock as never });

    expect(out).toEqual([{ key: "photos/co1/job1/a photo.png", thumbKey: "thumbs/co1/job1/a photo.png.jpg" }]);
    const meta = await sharp(puts[0].Body).metadata();
    expect(meta.width).toBe(320);
    expect(meta.format).toBe("jpeg");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/api/v1/internal/photos/thumbnail-ready");
    expect((init.headers as Record<string, string>)["x-signature"]).toMatch(/^[0-9a-f]{64}$/);
  });
});
