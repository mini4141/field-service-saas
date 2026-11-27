import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { JsonLogger } from "@fss/shared";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new JsonLogger("api");

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    const started = Date.now();
    const done = (status: number) =>
      this.logger.log("request", { method: req.method, path: req.originalUrl, status, ms: Date.now() - started });
    return next.handle().pipe(
      tap({ next: () => done(res.statusCode), error: (e) => done(e?.getStatus?.() ?? 500) }),
    );
  }
}
