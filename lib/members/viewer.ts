import type { ViewerAccessContext } from "@/lib/members/types";

export async function getPublicViewerContext(): Promise<ViewerAccessContext> {
  // TODO: Replace with real member-auth session lookup when member login ships.
  return { isMember: false };
}
