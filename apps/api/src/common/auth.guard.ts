import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { currentContext, requestContext } from "@fss/shared";
import { IS_PUBLIC, ROLES, Role } from "./decorators";

/** Global guard: verifies the bearer JWT, binds tenant to the request context, enforces @Roles. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedException();
    let payload: { sub: string; companyId: string; role: Role; typ?: string };
    try {
      payload = await this.jwt.verifyAsync(header.slice(7));
    } catch {
      throw new UnauthorizedException();
    }
    if (payload.typ === "refresh") throw new UnauthorizedException();
    req.user = payload;

    const store = currentContext();
    if (store) Object.assign(store, { companyId: payload.companyId, userId: payload.sub, role: payload.role });
    else requestContext.enterWith({ requestId: req.headers["x-request-id"] ?? "unknown", companyId: payload.companyId, userId: payload.sub, role: payload.role });

    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES, targets);
    if (roles?.length && !roles.includes(payload.role)) throw new ForbiddenException("Insufficient role");
    return true;
  }
}
