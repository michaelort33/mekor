export const NEWSLETTER_RECIPIENT_LIST_KEYS = ["michael_test"] as const;

export type NewsletterRecipientListKey = (typeof NEWSLETTER_RECIPIENT_LIST_KEYS)[number];

export type NewsletterRecipientList = {
  key: NewsletterRecipientListKey;
  name: string;
  description: string;
  emails: readonly string[];
};

export const NEWSLETTER_RECIPIENT_LISTS: readonly NewsletterRecipientList[] = [
  {
    key: "michael_test",
    name: "Michael test list",
    description: "Tests only · michaelort@hyatus.com",
    emails: ["michaelort@hyatus.com"],
  },
];

export const NEWSLETTER_AUDIENCE_OPTIONS = [
  {
    key: "michael_test",
    name: "Michael test list",
    description: "Safe test send to michaelort@hyatus.com",
    recipientGroup: "recipient_list",
  },
  {
    key: "newsletter_subscribers",
    name: "Confirmed newsletter subscribers",
    description: "Everyone currently confirmed for the weekly newsletter",
    recipientGroup: "newsletter_subscribers",
  },
  {
    key: "admins_only",
    name: "Admins only",
    description: "Mekor administrators who can receive email",
    recipientGroup: "admins_only",
  },
] as const;

export type NewsletterAudienceKey = (typeof NEWSLETTER_AUDIENCE_OPTIONS)[number]["key"];

export function getNewsletterRecipientList(key: NewsletterRecipientListKey) {
  return NEWSLETTER_RECIPIENT_LISTS.find((list) => list.key === key)!;
}
