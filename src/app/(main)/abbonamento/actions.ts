"use server";

import { requireUser } from "@/lib/auth";
import { getBillingInfo, type BillingInfo } from "@/lib/billing";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function getBillingDashboardData(): Promise<BillingInfo> {
  const { userId } = await requireUser();
  return getBillingInfo(userId);
}

export async function createCheckoutSession(
  plan: "monthly" | "yearly"
): Promise<{ success: boolean; url?: string; message?: string }> {
  const { userId, email } = await requireUser();

  const priceId =
    plan === "monthly"
      ? process.env.STRIPE_PRICE_MONTHLY!
      : process.env.STRIPE_PRICE_YEARLY!;

  // Find or create Subscription row with Stripe customer
  let subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  let stripeCustomerId: string;

  if (subscription) {
    stripeCustomerId = subscription.stripeCustomerId;
  } else {
    // Create Stripe customer
    const customer = await stripe.customers.create({ email });
    stripeCustomerId = customer.id;

    // Create Subscription row (status: free until checkout completes)
    await prisma.subscription.create({
      data: {
        userId,
        stripeCustomerId,
        status: "free",
      },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/abbonamento?success=true`,
    cancel_url: `${appUrl}/abbonamento?canceled=true`,
  });

  return { success: true, url: session.url! };
}

export async function createPortalSession(): Promise<{
  success: boolean;
  url?: string;
  message?: string;
}> {
  const { userId } = await requireUser();

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (!subscription) {
    return { success: false, message: "Nessun abbonamento trovato" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${appUrl}/abbonamento`,
  });

  return { success: true, url: session.url };
}
