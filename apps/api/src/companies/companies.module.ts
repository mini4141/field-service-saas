import { Controller, Get, Module } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../core/core.module";
import { AuthUser, CurrentUser } from "../common/decorators";
import { CompanyDto } from "../dto/models.dto";

@ApiTags("companies")
@Controller("company")
class CompaniesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @ApiOkResponse({ type: CompanyDto })
  get(@CurrentUser() u: AuthUser) {
    return this.prisma.raw.company.findUniqueOrThrow({ where: { id: u.companyId } });
  }
}

@Module({ controllers: [CompaniesController] })
export class CompaniesModule {}
