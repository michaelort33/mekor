export async function persistThenDeliver<T>(input: {
  persist: () => Promise<T>;
  deliver: (persisted: T) => Promise<void>;
}) {
  const persisted = await input.persist();

  try {
    await input.deliver(persisted);
    return {
      persisted,
      delivered: true,
      deliveryError: null,
    } as const;
  } catch (error) {
    return {
      persisted,
      delivered: false,
      deliveryError: error instanceof Error ? error.message : "Delivery failed",
    } as const;
  }
}
