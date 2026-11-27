import { SetMetadata, createParamDecorator, ExecutionContext } from "@nestjs/common";

export type Role = "owner" | "office" | "field";
export const IS_PUBLIC = "isPublic";
export const ROLES = "roles";

export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export interface AuthUser { sub: string; companyId: string; role: Role }
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser =>
  ctx.switchToHttp().getRequest().user);
