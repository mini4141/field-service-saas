import { randomUUID } from "node:crypto";
import { Body, Controller, HttpCode, Module, NotFoundException, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { presignPut } from "@fss/shared";
import { PrismaService } from "../core/core.module";
import { AuthUser, CurrentUser } from "../common/decorators";
import { PresignDto } from "../dto/requests.dto";
import { PresignResponseDto } from "../dto/models.dto";

@ApiTags("uploads")
@Controller("uploads")
class UploadsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Registers the photo row and returns a presigned PUT so the client uploads straight to S3. */
  @Post("presign") @HttpCode(200) @ApiOkResponse({ type: PresignResponseDto })
  async presign(@CurrentUser() u: AuthUser, @Body() dto: PresignDto) {
    const job = await this.prisma.db.job.findUnique({ where: { id: dto.jobId } });
    if (!job) throw new NotFoundException();
    const safe = dto.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `photos/${u.companyId}/${dto.jobId}/${randomUUID()}-${safe}`;
    const photo = await this.prisma.db.jobPhoto.create({ data: { jobId: dto.jobId, key } as any });
    return { url: await presignPut(key, dto.contentType), key, photoId: photo.id };
  }
}

@Module({ controllers: [UploadsController] })
export class UploadsModule {}
