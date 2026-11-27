import { createApiClient } from "@fss/api-client";

// Same-origin on CloudFront (/api is routed to the API); an explicit URL for local dev.
const baseUrl = process.env.EXPO_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "");

let token: string | null = null;
export const setToken = (t: string | null) => { token = t; };

export const api = createApiClient({ baseUrl, getToken: () => token });
