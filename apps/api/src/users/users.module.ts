import { Controller, Get, Module, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../core/core.module";
import { Roles } from "../common/decorators";
import { UserDto } from "../dto/models.dto";

@ApiTags("users")
@Controller("users")
class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @Roles("owner", "office") @ApiQuery({ name: "role", required: false }) @ApiOkResponse({ type: [UserDto] })
  list(@Query("role") role?: "owner" | "office" | "field") {
    return this.prisma.db.user.findMany({
      where: role ? { role } : {},
      select: { id: true, name: true, email: true, role: true, companyId: true, inviteToken: true },
      orderBy: { name: "asc" },
    });
  }
}

@Module({ controllers: [UsersController] })
export class UsersModule {}
