import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  requestId: string;
  companyId?: string;
  userId?: string;
  role?: "owner" | "office" | "field";
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const currentContext = (): RequestContext | undefined => requestContext.getStore();

/** Run `fn` with (a copy of) the current context extended by `patch`. */
export function runWithContext<T>(patch: Partial<RequestContext>, fn: () => T): T {
  const base = currentContext() ?? { requestId: patch.requestId ?? "system" };
  return requestContext.run({ ...base, ...patch }, fn);
}
