import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsEmail, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Min, MinLength, ValidateNested } from "class-validator";

export class SignupDto {
  @IsString() @MinLength(1) companyName: string;
  @IsString() @MinLength(1) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

export class InviteDto {
  @IsString() @MinLength(1) name: string;
  @IsEmail() email: string;
  @IsIn(["office", "field"]) role: "office" | "field";
}

export class AcceptInviteDto {
  @IsString() token: string;
  @IsString() @MinLength(8) password: string;
}

export class CustomerInputDto {
  @IsString() @MinLength(1) name: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
}

export class QuoteItemInputDto {
  @IsString() @MinLength(1) description: string;
  @IsInt() @Min(1) qty: number;
  @IsInt() @Min(0) unitPrice: number;
  @IsInt() @Min(0) taxPercent: number;
}

export class CreateQuoteDto {
  @IsUUID() customerId: string;
  @IsString() @MinLength(1) title: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => QuoteItemInputDto)
  items: QuoteItemInputDto[];
}

export class ScheduleJobDto {
  @IsISO8601() scheduledAt: string;
  @IsUUID() assigneeId: string;
}

export class CompleteJobDto {
  @IsOptional() @IsString() notes?: string;
}

export class PresignDto {
  @IsUUID() jobId: string;
  @IsString() @MinLength(1) filename: string;
  @IsString() contentType: string;
}

export class ThumbnailReadyDto {
  @IsString() key: string;
  @IsString() thumbKey: string;
}
