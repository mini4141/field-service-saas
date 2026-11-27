import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { requestContext } from "@fss/shared";

/** Reads or creates x-request-id, echoes it, and opens the async context for the request. */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();
  req.headers["x-request-id"] = requestId;
  res.setHeader("x-request-id", requestId);
  requestContext.run({ requestId }, next);
}
