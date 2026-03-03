import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { stripeCustomers, users } from "@/db/schema";
import { getStripeClient } from "@/lib/stripe/client";

export async function getOrCreateStripeCustomer(input: {
  userId: number;
  email: string;
  displayName: string;
}) {
  const db = getDb();
  const [existing] = await db
    .select({ stripeCustomerId: stripeCustomers.stripeCustomerId })
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, input.userId))
    .limit(1);

  if (existing) {
    return existing.stripeCustomerId;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: input.email,
    name: input.displayName,
    metadata: {
      userId: String(input.userId),
    },
  });

  await db.insert(stripeCustomers).values({
    userId: input.userId,
    stripeCustomerId: customer.id,
    updatedAt: new Date(),
  });

  return customer.id;
}

export async function getUserForStripeCustomerId(stripeCustomerId: string) {
  const [row] = await getDb()
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(stripeCustomers)
    .innerJoin(users, eq(users.id, stripeCustomers.userId))
    .where(eq(stripeCustomers.stripeCustomerId, stripeCustomerId))
    .limit(1);

  if (!row) return null;

  return {
    userId: row.userId,
    email: row.email,
    displayName: row.displayName,
  };
}
