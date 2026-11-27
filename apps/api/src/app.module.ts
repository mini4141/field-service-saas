import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AuthGuard } from "./common/auth.guard";
import { LoggingInterceptor } from "./common/logging.interceptor";
import { CoreModule } from "./core/core.module";
import { AuthModule } from "./auth/auth.controller";
import { CompaniesModule } from "./companies/companies.module";
import { UsersModule } from "./users/users.module";
import { CustomersModule } from "./customers/customers.module";
import { QuotesModule } from "./quotes/quotes.module";
import { JobsModule } from "./jobs/jobs.module";
import { UploadsModule } from "./uploads/uploads.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { InternalModule } from "./internal/internal.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    CoreModule, AuthModule, CompaniesModule, UsersModule, CustomersModule, QuotesModule,
    JobsModule, UploadsModule, InvoicesModule, DashboardModule, InternalModule, HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
