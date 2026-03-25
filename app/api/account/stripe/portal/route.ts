import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireApprovedMemberAccountAccess } from "@/lib/auth/account-access";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { getStripeClient } from "@/lib/stripe/client";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customers";

export async function POST(request: Request) {
  if (!(await isFeatureEnabled("FEATURE_DUES"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  const access = await requireApprovedMemberAccountAccess();
  if ("error" in access) {
    return access.error;
  }

  const [user] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(users)
    .where(eq(users.id, access.session.userId))
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
