import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { getStripeClient } from "@/lib/stripe/client";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customers";

export async function POST(request: Request) {
  if (!isFeatureEnabled("FEATURE_DUES")) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const stripeCustomerId = await getOrCreateStripeCustomer({
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
  });

  const stripe = getStripeClient();
  const origin = new URL(request.url).origin;
  const portal = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${origin}/account/dues`,
  });

  return NextResponse.json({ url: portal.url });
}
