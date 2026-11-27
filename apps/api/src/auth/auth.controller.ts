import { Body, Controller, Get, HttpCode, Module, Post, Req, Res } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { AcceptInviteDto, InviteDto, LoginDto, SignupDto } from "../dto/requests.dto";
import { AuthResponseDto, InviteResponseDto, UserDto } from "../dto/models.dto";
import { AuthUser, CurrentUser, Public, Roles } from "../common/decorators";

const COOKIE = "fss_refresh";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private session(res: Response, r: { accessToken: string; refreshToken: string; user: any }) {
    res.cookie(COOKIE, r.refreshToken, { httpOnly: true, sameSite: "lax", path: "/api/v1/auth", maxAge: 7 * 86400_000 });
    return { accessToken: r.accessToken, user: r.user };
  }

  @Public() @Post("signup") @ApiCreatedResponse({ type: AuthResponseDto })
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    return this.session(res, await this.auth.signup(dto));
  }

  @Public() @Post("login") @HttpCode(200) @ApiOkResponse({ type: AuthResponseDto })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.session(res, await this.auth.login(dto));
  }

  @Public() @Post("refresh") @HttpCode(200) @ApiOkResponse({ type: AuthResponseDto })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookie = /(?:^|;\s*)fss_refresh=([^;]+)/.exec(req.headers.cookie ?? "")?.[1];
    return this.session(res, await this.auth.refresh(cookie));
  }

  @Public() @Post("accept-invite") @HttpCode(200) @ApiOkResponse({ type: AuthResponseDto })
  async acceptInvite(@Body() dto: AcceptInviteDto, @Res({ passthrough: true }) res: Response) {
    return this.session(res, await this.auth.acceptInvite(dto));
  }

  @Roles("owner") @Post("invite") @ApiCreatedResponse({ type: InviteResponseDto })
  invite(@CurrentUser() u: AuthUser, @Body() dto: InviteDto) {
    return this.auth.invite(u.companyId, dto);
  }

  @Get("me") @ApiOkResponse({ type: UserDto })
  me(@CurrentUser() u: AuthUser) {
    return this.auth.me(u.sub);
  }
}

@Module({ controllers: [AuthController], providers: [AuthService] })
export class AuthModule {}
