import { LoggerService } from "@nestjs/common";
import { currentContext } from "./context";

type Level = "log" | "error" | "warn" | "debug" | "verbose" | "fatal";

/** Structured JSON logger that stamps requestId + companyId from the async context. */
export class JsonLogger implements LoggerService {
  constructor(private readonly service: string) {}

  private write(level: Level, message: unknown, extra?: unknown[]) {
    const ctx = currentContext();
    const line = {
      ts: new Date().toISOString(),
      level,
      service: this.service,
      requestId: ctx?.requestId,
      companyId: ctx?.companyId,
      msg: typeof message === "string" ? message : JSON.stringify(message),
      ...(extra && extra.length && typeof extra[0] === "object" ? (extra[0] as object) : {}),
    };
    (level === "error" || level === "fatal" ? process.stderr : process.stdout).write(JSON.stringify(line) + "\n");
  }

  log(m: unknown, ...e: unknown[]) { this.write("log", m, e); }
  error(m: unknown, ...e: unknown[]) { this.write("error", m, e); }
  warn(m: unknown, ...e: unknown[]) { this.write("warn", m, e); }
  debug(m: unknown, ...e: unknown[]) { this.write("debug", m, e); }
  verbose(m: unknown, ...e: unknown[]) { this.write("verbose", m, e); }
  fatal(m: unknown, ...e: unknown[]) { this.write("fatal", m, e); }
}

/** Plain helper for non-Nest code (Lambda, scripts). */
export function logJson(service: string, msg: string, extra: Record<string, unknown> = {}) {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), level: "log", service, msg, ...extra }) + "\n");
}
