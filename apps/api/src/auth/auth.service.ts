import { randomUUID } from "node:crypto";
import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../core/core.module";
import { AcceptInviteDto, InviteDto, LoginDto, SignupDto } from "../dto/requests.dto";
import { config } from "../config";

const publicUser = (u: { id: string; name: string; email: string; role: any; companyId: string }) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, companyId: u.companyId,
});

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async tokens(u: { id: string; companyId: string; role: any }) {
    const claims = { sub: u.id, companyId: u.companyId, role: u.role };
    const accessToken = await this.jwt.signAsync(claims);
    const refreshToken = await this.jwt.signAsync({ ...claims, typ: "refresh" }, { expiresIn: "7d", secret: config.jwtSecret });
    return { accessToken, refreshToken };
  }

  async signup(dto: SignupDto) {
    if (await this.prisma.raw.user.findUnique({ where: { email: dto.email } })) throw new ConflictException("Email already registered");
    const company = await this.prisma.raw.company.create({
      data: {
        name: dto.companyName,
        users: { create: { name: dto.name, email: dto.email, role: "owner", passwordHash: await bcrypt.hash(dto.password, 10) } },
      },
      include: { users: true },
    });
    const user = company.users[0];
    return { user: publicUser(user), ...(await this.tokens(user)) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.raw.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException("Invalid credentials");
    return { user: publicUser(user), ...(await this.tokens(user)) };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException();
    try {
      const p = await this.jwt.verifyAsync(refreshToken);
      if (p.typ !== "refresh") throw new Error("not a refresh token");
      const user = await this.prisma.raw.user.findUniqueOrThrow({ where: { id: p.sub } });
      return { user: publicUser(user), ...(await this.tokens(user)) };
    } catch {
      throw new UnauthorizedException();
    }
  }

  async invite(companyId: string, dto: InviteDto) {
    if (await this.prisma.raw.user.findUnique({ where: { email: dto.email } })) throw new ConflictException("Email already registered");
    const inviteToken = randomUUID();
    const user = await this.prisma.raw.user.create({
      data: { companyId, name: dto.name, email: dto.email, role: dto.role, inviteToken },
    });
    return { user: publicUser(user), inviteToken };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const user = await this.prisma.raw.user.findUnique({ where: { inviteToken: dto.token } });
    if (!user) throw new UnauthorizedException("Invalid invite");
    const updated = await this.prisma.raw.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(dto.password, 10), inviteToken: null },
    });
    return { user: publicUser(updated), ...(await this.tokens(updated)) };
  }

  async me(id: string) {
    return publicUser(await this.prisma.raw.user.findUniqueOrThrow({ where: { id } }));
  }
}
