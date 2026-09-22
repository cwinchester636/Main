// Free-tier limits mirrored from worker/src/utils.js — these exist so the
// UI can pre-emptively show a paywall instead of firing a request that's
// only going to be rejected, but the server enforces the real limit
// regardless of what the client thinks. See README "Pro tier / paywall".
export const FREE_COLLECTION_LIMIT = 25
export const FREE_MAX_RADIUS_MILES = 5
