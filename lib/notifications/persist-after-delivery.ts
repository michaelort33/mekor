export async function persistAfterSuccessfulDelivery<T>(input: {
  deliver: () => Promise<void>;
  persist: () => Promise<T>;
}) {
  await input.deliver();
  return input.persist();
}
