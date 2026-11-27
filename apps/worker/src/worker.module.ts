import { Controller, Get, Module } from "@nestjs/common";
import { CoreModule } from "./core.module";
import { InvoiceService } from "./invoice.service";
import { InvoicePdfProcessor, InvoiceReadyListener, KpiRefreshProcessor, NotificationsProcessor } from "./processors";

@Controller()
class HealthController {
  @Get("healthz")
  healthz() {
    return { status: "ok" };
  }
}

@Module({
  imports: [CoreModule],
  controllers: [HealthController],
  providers: [InvoiceService, InvoicePdfProcessor, InvoiceReadyListener, NotificationsProcessor, KpiRefreshProcessor],
})
export class WorkerModule {}
