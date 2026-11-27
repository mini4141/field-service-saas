import { createApiClient, unwrap } from "@fss/api-client";

export { unwrap };
export const TOKEN_KEY = "fss_token";
export const USER_KEY = "fss_user";

const isBrowser = typeof window !== "undefined";

/** Browser client: same-origin /api (Next rewrite locally, Traefik ingress on K8s). */
export const api = createApiClient({
  baseUrl: isBrowser ? window.location.origin : "",
  getToken: () => (isBrowser ? localStorage.getItem(TOKEN_KEY) : null),
});

export interface SessionUser { id: string; name: string; email: string; role: "owner" | "office" | "field"; companyId: string }

export const getUser = (): SessionUser | null => {
  if (!isBrowser) return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as SessionUser) : null;
};

export function saveSession(accessToken: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
