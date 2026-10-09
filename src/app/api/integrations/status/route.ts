import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requirePlatformRead } from "@/lib/auth/api-auth";
import { integrationStatus } from "@/lib/integrations";

export const dynamic = "force-dynamic";

/** Super Admin — integration readiness (no secrets returned) */
export async function GET(request: NextRequest) {
  const auth = await requirePlatformRead(request);
  if (!auth.ok) return auth.response;

  const status = integrationStatus();
  return NextResponse.json({
    sandbox: status.sandbox,
    rails: {
      jazzcash: { mode: status.jazzcash.mode, configured: status.jazzcash.configured },
      easypaisa: { mode: status.easypaisa.mode, configured: status.easypaisa.configured },
      stripe: { mode: status.stripe.mode, configured: status.stripe.configured },
      sms: { mode: status.sms.mode, configured: status.sms.configured, provider: status.sms.provider },
      email: { mode: status.email.mode, configured: status.email.configured },
      whatsapp: { mode: status.whatsapp.mode, configured: status.whatsapp.configured },
    },
    hint: "Set INTEGRATIONS_SANDBOX=false and provider env keys for live mode. See .env.example.",
  });
}
