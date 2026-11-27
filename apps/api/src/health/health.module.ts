import { Controller, Get, Module } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Public } from "../common/decorators";

@ApiExcludeController()
@Public()
@Controller()
class HealthController {
  @Get("healthz")
  healthz() {
    return { status: "ok" };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
