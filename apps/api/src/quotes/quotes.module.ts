import { Body, Controller, Get, HttpCode, Module, Param, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { QuotesService } from "./quotes.service";
import { AuthUser, CurrentUser, Public, Roles } from "../common/decorators";
import { CreateQuoteDto } from "../dto/requests.dto";
import { PublicQuoteDto, QuoteDto } from "../dto/models.dto";

@ApiTags("quotes")
@Roles("owner", "office")
@Controller("quotes")
class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Post() @ApiCreatedResponse({ type: QuoteDto })
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateQuoteDto) {
    return this.quotes.create(u.companyId, dto);
  }

  @Get() @ApiOkResponse({ type: [QuoteDto] })
  list() {
    return this.quotes.list();
  }

  @Get(":id") @ApiOkResponse({ type: QuoteDto })
  get(@Param("id") id: string) {
    return this.quotes.get(id);
  }

  @Post(":id/send") @HttpCode(200) @ApiOkResponse({ type: QuoteDto })
  send(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.quotes.send(id, u.companyId);
  }
}

@ApiTags("public")
@Public()
@Controller("public/quotes")
class PublicQuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get(":token") @ApiOkResponse({ type: PublicQuoteDto })
  view(@Param("token") token: string) {
    return this.quotes.publicView(token);
  }

  @Post(":token/accept") @HttpCode(200) @ApiOkResponse({ type: PublicQuoteDto })
  accept(@Param("token") token: string) {
    return this.quotes.accept(token);
  }
}

@Module({ controllers: [QuotesController, PublicQuotesController], providers: [QuotesService] })
export class QuotesModule {}
