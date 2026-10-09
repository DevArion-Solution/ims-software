/** Phase 5 integration config — keys from env; sandbox when unset or INTEGRATIONS_SANDBOX=true */

export function isIntegrationsSandbox(): boolean {
  const flag = process.env.INTEGRATIONS_SANDBOX ?? process.env.PAYMENTS_SANDBOX;
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return true;
  // Default sandbox when live credentials are missing
  return true;
}

export function jazzcashConfig() {
  return {
    merchantId: process.env.JAZZCASH_MERCHANT_ID ?? "",
    password: process.env.JAZZCASH_PASSWORD ?? "",
    integritySalt: process.env.JAZZCASH_INTEGRITY_SALT ?? "",
    returnUrl: process.env.JAZZCASH_RETURN_URL ?? "",
    configured: Boolean(
      process.env.JAZZCASH_MERCHANT_ID &&
        process.env.JAZZCASH_PASSWORD &&
        process.env.JAZZCASH_INTEGRITY_SALT,
    ),
  };
}

export function easypaisaConfig() {
  return {
    storeId: process.env.EASYPAISA_STORE_ID ?? "",
    hashKey: process.env.EASYPAISA_HASH_KEY ?? "",
    returnUrl: process.env.EASYPAISA_RETURN_URL ?? "",
    configured: Boolean(process.env.EASYPAISA_STORE_ID && process.env.EASYPAISA_HASH_KEY),
  };
}

export function stripeConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  const publishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
    process.env.STRIPE_PUBLIC_KEY ??
    "";
  return {
    secretKey,
    publishableKey,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    currency: process.env.STRIPE_CURRENCY ?? "pkr",
    // sk_ = standard secret; rk_ = restricted key (Checkout needs checkout.write permission)
    configured: Boolean(
      (secretKey.startsWith("sk_") || secretKey.startsWith("rk_")) &&
        publishableKey.startsWith("pk_"),
    ),
  };
}

export function smsConfig() {
  return {
    provider: (process.env.SMS_PROVIDER ?? "sandbox") as "sandbox" | "twilio" | "local",
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? process.env.SMS_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? process.env.SMS_AUTH_TOKEN ?? "",
    from: process.env.TWILIO_FROM ?? process.env.SMS_FROM ?? "",
    configured: Boolean(
      (process.env.TWILIO_ACCOUNT_SID || process.env.SMS_ACCOUNT_SID) &&
        (process.env.TWILIO_AUTH_TOKEN || process.env.SMS_AUTH_TOKEN) &&
        (process.env.TWILIO_FROM || process.env.SMS_FROM),
    ),
  };
}

export function emailConfig() {
  return {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? "587"),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@ims.local",
    configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
  };
}

export function whatsappConfig() {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
    configured: Boolean(
      process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN,
    ),
  };
}

export function integrationStatus() {
  const sandbox = isIntegrationsSandbox();
  return {
    sandbox,
    jazzcash: { ...jazzcashConfig(), mode: sandbox || !jazzcashConfig().configured ? "sandbox" : "live" },
    easypaisa: {
      ...easypaisaConfig(),
      mode: sandbox || !easypaisaConfig().configured ? "sandbox" : "live",
    },
    stripe: {
      ...stripeConfig(),
      mode: sandbox || !stripeConfig().configured ? "sandbox" : "live",
    },
    sms: { ...smsConfig(), mode: sandbox || !smsConfig().configured ? "sandbox" : "live" },
    email: { ...emailConfig(), mode: sandbox || !emailConfig().configured ? "sandbox" : "live" },
    whatsapp: {
      ...whatsappConfig(),
      mode: sandbox || !whatsappConfig().configured ? "sandbox" : "live",
    },
  };
}
