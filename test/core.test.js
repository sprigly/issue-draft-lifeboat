const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../src/core.js");

test("只匹配 GitHub 仓库的新 issue 表单路径", () => {
  assert.equal(Core.isIssueNewPath("/octo/project/issues/new"), true);
  assert.equal(Core.isIssueNewPath("/octo/project/issues/new/"), true);
  assert.equal(Core.isIssueNewPath("/octo/project/issues"), false);
  assert.equal(Core.isIssueNewPath("/octo/project/issues/42"), false);
  assert.equal(Core.isIssueNewPath("/settings/issues/new"), false);
});

test("同仓库不同模板使用独立草稿键", () => {
  const plain = Core.getStorageKey("/octo/project/issues/new", "");
  const bug = Core.getStorageKey("/octo/project/issues/new", "?template=bug_report.md");
  const feature = Core.getStorageKey("/octo/project/issues/new", "?template=feature_request.md");
  assert.notEqual(plain, bug);
  assert.notEqual(bug, feature);
  assert.equal(Core.getStorageKey("/octo/project/issues/1", ""), null);
});

test("仅当表单为空且草稿未过期时允许恢复", () => {
  const now = 1_800_000_000_000;
  const draft = { title: "Bug title", body: "Steps to reproduce", savedAt: now - 1000 };
  assert.equal(Core.canRestore(draft, "", "", now), true);
  assert.equal(Core.canRestore(draft, "Already typed", "", now), false);
  assert.equal(Core.canRestore(draft, "", "Existing body", now), false);
  assert.equal(Core.canRestore({ ...draft, savedAt: now - Core.DRAFT_TTL_MS - 1 }, "", "", now), false);
  assert.equal(Core.canRestore({ title: "x", body: "y" }, "", "", now), false);
});

test("草稿按 14 天过期，保存时间格式可读", () => {
  const now = 1_800_000_000_000;
  assert.equal(Core.isExpired({ savedAt: now - Core.DRAFT_TTL_MS + 1 }, now), false);
  assert.equal(Core.isExpired({ savedAt: now - Core.DRAFT_TTL_MS - 1 }, now), true);
  assert.equal(Core.formatSavedAt(now - 30_000, now), "刚刚");
  assert.equal(Core.formatSavedAt(now - 5 * 60_000, now), "5 分钟前");
});
