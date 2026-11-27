import { Controller, ConflictException, Get, Module, NotFoundException, Param } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { presignGet } from "@fss/shared";
import { PrismaService } from "../core/core.module";
import { Roles } from "../common/decorators";
import { DownloadDto, InvoiceDto } from "../dto/models.dto";

@ApiTags("invoices")
@Roles("owner", "office")
@Controller("invoices")
class InvoicesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @ApiOkResponse({ type: [InvoiceDto] })
  list() {
    return this.prisma.db.invoice.findMany({ orderBy: { createdAt: "desc" } });
  }

  @Get(":id") @ApiOkResponse({ type: InvoiceDto })
  async get(@Param("id") id: string) {
    const inv = await this.prisma.db.invoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException();
    return inv;
  }

  @Get(":id/download") @ApiOkResponse({ type: DownloadDto })
  async download(@Param("id") id: string) {
    const inv = await this.prisma.db.invoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException();
    if (inv.status !== "ready" || !inv.pdfKey) throw new ConflictException("Invoice PDF is not ready yet");
    return { url: await presignGet(inv.pdfKey) };
  }
}

@Module({ controllers: [InvoicesController] })
export class InvoicesModule {}
