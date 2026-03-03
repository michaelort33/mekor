# Profile Visibility Policy (Phase 1)

## Scope
- Policy applies to profile detail routes under `/profile/*`.
- Source of truth is repo-managed config in `lib/profile-visibility/config.ts`.
- No member auth, directory route, or database storage is introduced in this phase.

## Visibility Levels
- `private` (default): profile is not publicly visible and route should return 404.
- `members_only`: policy-complete but treated as non-public in this phase because member auth is not implemented.
- `public`: profile is publicly routable and discoverable in search.
- `anonymous`: detail route is non-public in this phase; anonymous directory behavior is deferred.

## Audience Semantics
- Runtime audience in this phase is `public`.
- `member` audience is defined in types/policy for future auth integration.

## Enforcement in Phase 1
- Profile route static params only include profiles that pass `canViewProfile(path, "public")`.
- Metadata and page rendering return non-public behavior for profiles that fail public visibility.
- Search excludes profile records that fail `isProfileSearchVisible(path, "public")`.

## Migration Approach
- Global default remains `private`.
- Existing public behavior is preserved through explicit allowlist entries in config.
