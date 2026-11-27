import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

export type { components, paths };
export type Schemas = components["schemas"];

export interface ApiClientOptions {
  /** Origin of the API ("" = same origin as the page). */
  baseUrl?: string;
  /** Returns the current access token, if any. */
  getToken?: () => string | null | undefined;
  fetch?: typeof fetch;
}

/** Works in insecure (http) browser contexts where crypto.randomUUID is unavailable. */
export function newRequestId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** The only way web and mobile talk to the API: typed from openapi.json, with x-request-id correlation. */
export function createApiClient(opts: ApiClientOptions = {}) {
  const client = createClient<paths>({ baseUrl: opts.baseUrl ?? "", credentials: "include", fetch: opts.fetch });
  client.use({
    onRequest({ request }) {
      request.headers.set("x-request-id", request.headers.get("x-request-id") ?? newRequestId());
      const token = opts.getToken?.();
      if (token) request.headers.set("authorization", `Bearer ${token}`);
      return request;
    },
  });
  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** Unwraps an openapi-fetch result, throwing on error so TanStack Query sees failures. */
export function unwrap<T>(res: { data?: T; error?: unknown; response: Response }): T {
  if (res.error !== undefined || res.data === undefined) {
    const err = new Error(`API ${res.response.status}`) as Error & { status: number };
    err.status = res.response.status;
    throw err;
  }
  return res.data;
}
