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

export function getNewsletterRecipientList(key: NewsletterRecipientListKey) {
  return NEWSLETTER_RECIPIENT_LISTS.find((list) => list.key === key)!;
}
