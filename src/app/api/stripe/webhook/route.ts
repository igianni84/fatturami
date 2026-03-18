import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

/** Extract current_period_end from the first subscription item */
async function getSubscriptionPeriodEnd(subscriptionId: string): Promise<Date> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items"],
  });
  const periodEnd = sub.items.data[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000) : new Date();
}

/** Extract subscription ID from Stripe Invoice parent field */
function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  if (
    invoice.parent?.type === "subscription_details" &&
    invoice.parent.subscription_details?.subscription
  ) {
    const sub = invoice.parent.subscription_details.subscription;
    return typeof sub === "string" ? sub : sub.id;
  }
  return null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription && session.customer) {
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
        const customerId = typeof session.customer === "string"
          ? session.customer
          : session.customer.id;

        const periodEnd = await getSubscriptionPeriodEnd(subscriptionId);

        await prisma.subscription.update({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: subscriptionId,
            status: "active",
            currentPeriodEnd: periodEnd,
          },
        });
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getSubscriptionIdFromInvoice(invoice);
      if (subscriptionId && invoice.customer) {
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer.id;

        const periodEnd = await getSubscriptionPeriodEnd(subscriptionId);

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status: "active",
            currentPeriodEnd: periodEnd,
          },
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.customer) {
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer.id;

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: "past_due" },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string"
        ? sub.customer
        : sub.customer.id;

      await prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          status: "canceled",
          stripeSubscriptionId: null,
        },
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string"
        ? sub.customer
        : sub.customer.id;

      const statusMap: Record<string, "active" | "past_due" | "canceled"> = {
        active: "active",
        past_due: "past_due",
        canceled: "canceled",
        unpaid: "past_due",
      };

      const mappedStatus = statusMap[sub.status];
      if (mappedStatus) {
        // Get period end from first item
        const periodEnd = sub.items.data[0]?.current_period_end;

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status: mappedStatus,
            ...(periodEnd ? { currentPeriodEnd: new Date(periodEnd * 1000) } : {}),
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
