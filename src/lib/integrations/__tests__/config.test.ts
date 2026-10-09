import { afterEach, describe, expect, it } from "vitest";
import { isIntegrationsSandbox, jazzcashConfig, stripeConfig } from "@/lib/integrations/config";

describe("integrations config", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("defaults to sandbox when flag unset", () => {
    delete process.env.INTEGRATIONS_SANDBOX;
    delete process.env.PAYMENTS_SANDBOX;
    expect(isIntegrationsSandbox()).toBe(true);
  });

  it("respects INTEGRATIONS_SANDBOX=false", () => {
    process.env.INTEGRATIONS_SANDBOX = "false";
    expect(isIntegrationsSandbox()).toBe(false);
  });

  it("jazzcash configured only when all keys present", () => {
    delete process.env.JAZZCASH_MERCHANT_ID;
    expect(jazzcashConfig().configured).toBe(false);

    process.env.JAZZCASH_MERCHANT_ID = "m1";
    process.env.JAZZCASH_PASSWORD = "p1";
    process.env.JAZZCASH_INTEGRITY_SALT = "s1";
    expect(jazzcashConfig().configured).toBe(true);
  });

  it("stripe configured when secret + publishable keys look valid", () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    delete process.env.STRIPE_PUBLIC_KEY;
    expect(stripeConfig().configured).toBe(false);

    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_abc";
    expect(stripeConfig().configured).toBe(true);

    process.env.STRIPE_SECRET_KEY = "rk_live_abc";
    expect(stripeConfig().configured).toBe(true);
  });
});
