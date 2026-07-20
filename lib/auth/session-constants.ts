/** Browser + token lifetime for `mekor_user_session` after login. */
export const USER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * When a valid session has less than this much time left, the proxy refreshes
 * the cookie so active users stay signed in without a hard monthly cutoff.
 */
export const USER_SESSION_REFRESH_WITHIN_SECONDS = 60 * 60 * 24 * 14; // 14 days
