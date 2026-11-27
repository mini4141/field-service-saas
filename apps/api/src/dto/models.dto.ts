/** Response shapes. The Nest swagger plugin turns these classes into OpenAPI schemas. */
export class UserDto {
  id: string;
  name: string;
  email: string;
  role: "owner" | "office" | "field";
  companyId: string;
  inviteToken?: string | null;
}

export class AuthResponseDto {
  accessToken: string;
  user: UserDto;
}

export class InviteResponseDto {
  user: UserDto;
  inviteToken: string;
}

export class CompanyDto {
  id: string;
  name: string;
}

export class CustomerDto {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export class QuoteItemDto {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  taxPercent: number;
}

export class QuoteDto {
  id: string;
  title: string;
  status: "draft" | "sent" | "accepted";
  token: string;
  total: number;
  customerId: string;
  createdAt: string;
  sentAt?: string | null;
  acceptedAt?: string | null;
  items?: QuoteItemDto[];
  customer?: CustomerDto;
}

export class PublicQuoteDto {
  title: string;
  status: "draft" | "sent" | "accepted";
  total: number;
  companyName: string;
  customerName: string;
  items: QuoteItemDto[];
}

export class PhotoDto {
  id: string;
  url: string;
  thumbUrl?: string | null;
}

export class InvoiceDto {
  id: string;
  jobId: string;
  status: "pending" | "ready";
  total: number;
  createdAt: string;
  readyAt?: string | null;
}

export class JobDto {
  id: string;
  quoteId: string;
  title: string;
  address?: string | null;
  status: "unscheduled" | "scheduled" | "in_progress" | "completed";
  scheduledAt?: string | null;
  assigneeId?: string | null;
  checkedInAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  customer?: CustomerDto;
  invoice?: InvoiceDto | null;
  photos?: PhotoDto[];
}

export class PresignResponseDto {
  url: string;
  key: string;
  photoId: string;
}

export class DownloadDto {
  url: string;
}

export class KpisDto {
  quotesSent: number;
  quotesAccepted: number;
  conversionPercent: number;
  jobsCompletedThisWeek: number;
  revenueInvoiced: number;
  avgSecondsCompletionToInvoice: number | null;
  computedAt: string;
  cached: boolean;
}

export class OkDto {
  ok: boolean;
}
