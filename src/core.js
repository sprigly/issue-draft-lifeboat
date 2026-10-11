(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.IssueDraftCore = api;
})(globalThis, function () {
  "use strict";

  const STORAGE_PREFIX = "issue-draft-lifeboat:v1:";
  const MAX_DRAFT_CHARS = 100000;
  const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

  function isIssueNewPath(pathname) {
    return /^\/[^/]+\/[^/]+\/issues\/new\/?$/.test(String(pathname || ""));
  }

  function getStorageKey(pathname, search) {
    if (!isIssueNewPath(pathname)) return null;
    const params = new URLSearchParams(search || "");
    const template = params.get("template") || "";
    return STORAGE_PREFIX + pathname + "?template=" + encodeURIComponent(template);
  }

  function isExpired(draft, now) {
    if (!draft || !Number.isFinite(draft.savedAt)) return true;
    const currentTime = Number.isFinite(now) ? now : Date.now();
    return currentTime - draft.savedAt > DRAFT_TTL_MS;
  }

  function canRestore(draft, title, body, now) {
    return Boolean(
      draft &&
      !isExpired(draft, now) &&
      !String(title || "").trim() &&
      !String(body || "").trim()
    );
  }

  function formatSavedAt(timestamp, now) {
    const date = new Date(timestamp);
    if (!Number.isFinite(date.getTime())) return "未知时间";
    const currentTime = Number.isFinite(now) ? now : Date.now();
    const elapsed = Math.max(0, currentTime - date.getTime());
    if (elapsed < 60 * 1000) return "刚刚";
    if (elapsed < 60 * 60 * 1000) return Math.floor(elapsed / (60 * 1000)) + " 分钟前";
    if (elapsed < 24 * 60 * 60 * 1000) return Math.floor(elapsed / (60 * 60 * 1000)) + " 小时前";
    return Math.floor(elapsed / (24 * 60 * 60 * 1000)) + " 天前";
  }

  return {
    STORAGE_PREFIX,
    MAX_DRAFT_CHARS,
    DRAFT_TTL_MS,
    isIssueNewPath,
    getStorageKey,
    isExpired,
    canRestore,
    formatSavedAt
  };
});
