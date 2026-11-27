import { Body, Controller, Delete, Get, Module, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../core/core.module";
import { Roles } from "../common/decorators";
import { CustomerInputDto, UpdateCustomerDto } from "../dto/requests.dto";
import { CustomerDto, OkDto } from "../dto/models.dto";

@ApiTags("customers")
@Roles("owner", "office")
@Controller("customers")
class CustomersController {
  constructor(private readonly prisma: PrismaService) {}

  @Post() @ApiOkResponse({ type: CustomerDto })
  create(@Body() dto: CustomerInputDto) {
    return this.prisma.db.customer.create({ data: dto as any });
  }

  @Get() @ApiQuery({ name: "q", required: false }) @ApiOkResponse({ type: [CustomerDto] })
  list(@Query("q") q?: string) {
    return this.prisma.db.customer.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : {},
      orderBy: { name: "asc" },
    });
  }

  @Get(":id") @ApiOkResponse({ type: CustomerDto })
  async get(@Param("id") id: string) {
    return this.mustFind(id);
  }

  @Patch(":id") @ApiOkResponse({ type: CustomerDto })
  async update(@Param("id") id: string, @Body() dto: UpdateCustomerDto) {
    await this.mustFind(id);
    return this.prisma.db.customer.update({ where: { id }, data: dto });
  }

  @Delete(":id") @ApiOkResponse({ type: OkDto })
  async remove(@Param("id") id: string) {
    await this.mustFind(id);
    await this.prisma.db.customer.delete({ where: { id } });
    return { ok: true };
  }

  private async mustFind(id: string) {
    const c = await this.prisma.db.customer.findUnique({ where: { id } });
    if (!c) throw new NotFoundException();
    return c;
  }
}

@Module({ controllers: [CustomersController] })
export class CustomersModule {}
