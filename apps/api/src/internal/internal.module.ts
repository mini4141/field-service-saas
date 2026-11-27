import { createHmac, timingSafeEqual } from "node:crypto";
import { Body, Controller, Headers, HttpCode, Module, Req, UnauthorizedException, Post } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { runWithContext } from "@fss/shared";
import { PrismaService } from "../core/core.module";
import { Public } from "../common/decorators";
import { ThumbnailReadyDto } from "../dto/requests.dto";
import { config } from "../config";

/** Called by the thumbnailer Lambda; authenticated with an HMAC of the raw body, not a user JWT. */
@ApiExcludeController()
@Public()
@Controller("internal/photos")
class InternalController {
  constructor(private readonly prisma: PrismaService) {}

  @Post("thumbnail-ready") @HttpCode(200)
  async thumbnailReady(@Req() req: { rawBody?: Buffer }, @Headers("x-signature") sig: string | undefined, @Body() dto: ThumbnailReadyDto) {
    const expected = createHmac("sha256", config.hmacSecret).update(req.rawBody ?? Buffer.alloc(0)).digest("hex");
    const ok = sig && sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) throw new UnauthorizedException("Bad signature");
    // key layout: photos/<companyId>/<jobId>/<file>
    const companyId = dto.key.split("/")[1];
    // Prisma queries are lazy: they must be awaited *inside* the callback, or they run after the context is gone.
    await runWithContext({ companyId }, async () => {
      await this.prisma.db.jobPhoto.updateMany({ where: { key: dto.key }, data: { thumbKey: dto.thumbKey } });
    });
    return { ok: true };
  }
}

@Module({ controllers: [InternalController] })
export class InternalModule {}
