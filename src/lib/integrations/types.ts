export type PaymentGateway = "jazzcash" | "easypaisa" | "card" | "stripe";

export type NotifyChannel = "sms" | "email" | "whatsapp";

export interface PaymentInitiateInput {
  gateway: PaymentGateway;
  amount: number;
  feeId: string;
  studentName: string;
  month: string;
  tenantId: string;
  returnPath?: string;
}

export interface PaymentInitiateResult {
  ok: boolean;
  sandbox: boolean;
  txnRef: string;
  redirectUrl?: string;
  message: string;
  error?: string;
}

export interface PaymentConfirmResult {
  ok: boolean;
  sandbox: boolean;
  txnRef: string;
  gateway: PaymentGateway;
  amount: number;
  feeId: string;
  message: string;
  error?: string;
}

/** Optional per-school SMTP (Gmail App Password). When set, email sends live via this account. */
export type SmtpOverride = {
  host?: string;
  port?: number;
  user: string;
  pass: string;
  from?: string;
};

export interface NotifySendInput {
  channel: NotifyChannel;
  to: string;
  name?: string;
  subject?: string;
  body: string;
  template?: string;
  /** School Gmail / custom SMTP — takes priority over .env SMTP */
  smtp?: SmtpOverride;
}

export interface NotifySendResult {
  ok: boolean;
  sandbox: boolean;
  channel: NotifyChannel;
  to: string;
  providerId?: string;
  detail: string;
  error?: string;
}
