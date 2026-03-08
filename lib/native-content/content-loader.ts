import {
  buildSearchDocuments,
  getContentDocument,
  getPathVariants,
  loadContentIndex,
  loadRouteData,
  normalizePath,
  resolveContentPath,
  resolveRequestPath,
} from "@/lib/content/native-content";
import type {
  NativeContentDocument as NativePageDocument,
  NativeContentIndexRecord,
  NativeDocumentType,
  NativeSearchIndexRecord,
} from "@/lib/content/types";

export type { NativeContentIndexRecord, NativeDocumentType, NativePageDocument, NativeSearchIndexRecord };

export type NativeRouteContractRecord = {
  path: string;
  sourceUrl: string;
};

export type NativeStatusOverrideRecord = {
  path: string;
  status: number;
  sourceUrl: string;
};

export type NativeAliasRecord = {
  from: string;
  to: string;
  reason: string;
};

export type NativeRouteSets = {
  twoHundred: Set<string>;
  overrides: Map<string, number>;
  aliases: Map<string, string>;
};

export { getPathVariants, normalizePath };

export async function loadNativeContentIndex(): Promise<NativeContentIndexRecord[]> {
  return loadContentIndex();
}

export async function getNativeDocumentByPath(pathValue: string): Promise<NativePageDocument | null> {
  return getContentDocument(pathValue);
}

export async function getNativeSearchIndex(): Promise<NativeSearchIndexRecord[]> {
  return buildSearchDocuments();
}

export async function getNativeRouteSets(): Promise<NativeRouteSets> {
  const routes = await loadRouteData();
  const twoHundred = new Set<string>();
  const overrides = new Map<string, number>();
  const aliases = new Map<string, string>();

  for (const record of [...routes.canonical, ...routes.reachable]) {
    for (const variant of getPathVariants(record.path)) {
      twoHundred.add(variant);
    }
  }

  for (const record of routes.statusOverrides) {
    for (const variant of getPathVariants(record.path)) {
      overrides.set(variant, record.status);
    }
  }

  for (const record of routes.aliases) {
    const targets = getPathVariants(record.to);
    const target = targets[0] ?? normalizePath(record.to);
    for (const variant of getPathVariants(record.from)) {
      aliases.set(variant, target);
    }
  }

  return {
    twoHundred,
    overrides,
    aliases,
  };
}

export { resolveRequestPath };

export async function resolveNativeTemplatePath(pathValue: string) {
  const resolved = await resolveContentPath(pathValue);

  return {
    requestPath: resolved.requestPath,
    resolvedPath: resolved.resolvedPath,
    overrideStatus: resolved.overrideStatus,
    isKnownRoute: resolved.isKnownRoute,
    document: resolved.document,
  };
}
