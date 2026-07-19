/** localStorage helpers for per-user / per-project comment "seen" state. */

function storageKey(userId, projectId) {
  return `pms_comments_seen_${userId}_${projectId}`;
}

/** Returns the highest comment id the user has already opened on this project. */
export function getLastSeenCommentId(userId, projectId) {
  if (!userId || !projectId) return 0;
  try {
    const raw = localStorage.getItem(storageKey(userId, projectId));
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Marks comments as seen up to the latest id in the list. */
export function markCommentsSeen(userId, projectId, commentIds = []) {
  if (!userId || !projectId) return;
  const maxId = commentIds.reduce((max, id) => {
    const n = Number(id);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  if (maxId <= 0) return;
  const prev = getLastSeenCommentId(userId, projectId);
  if (maxId <= prev) return;
  try {
    localStorage.setItem(storageKey(userId, projectId), String(maxId));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Counts comments the current user has not opened yet (excludes own comments).
 */
export function countUnreadComments(comments, userId, projectId) {
  if (!userId || !projectId || !Array.isArray(comments) || comments.length === 0) {
    return 0;
  }
  const lastSeen = getLastSeenCommentId(userId, projectId);
  const uid = Number(userId);
  return comments.filter((c) => {
    const id = Number(c?.id);
    if (!Number.isFinite(id) || id <= lastSeen) return false;
    const authorId = Number(c?.user_id ?? c?.user?.id);
    if (Number.isFinite(authorId) && authorId === uid) return false;
    return true;
  }).length;
}
