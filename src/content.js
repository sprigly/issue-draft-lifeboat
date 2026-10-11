(() => {
  "use strict";

  if (!globalThis.IssueDraftCore || !globalThis.chrome?.storage?.local) return;

  const Core = globalThis.IssueDraftCore;
  const SAVE_DELAY_MS = 500;
  const SELECTORS = {
    title: 'input[name="issue[title]"], input[name="title"], input#issue_title',
    body: 'textarea[name="issue[body]"], textarea[name="body"], textarea#issue_body'
  };

  let currentKey = null;
  let currentFields = null;
  let currentDraft = null;
  let banner = null;
  let messageNode = null;
  let actionsNode = null;
  let saveTimer = null;
  let pendingSave = null;
  let loadGeneration = 0;
  let lastPath = location.pathname + location.search;
  const boundFields = new WeakSet();

  function getFields() {
    const title = document.querySelector(SELECTORS.title);
    const body = document.querySelector(SELECTORS.body);
    if (!title || !body) return null;
    return { title, body };
  }

  function getKey() {
    return Core.getStorageKey(location.pathname, location.search);
  }

  function makeButton(label, onClick, secondary) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.cssText = [
      "appearance:none",
      "border:1px solid " + (secondary ? "#d0d7de" : "#1f6feb"),
      "border-radius:6px",
      "padding:5px 10px",
      "background:" + (secondary ? "#ffffff" : "#1f6feb"),
      "color:" + (secondary ? "#24292f" : "#ffffff"),
      "font:600 12px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
      "cursor:pointer"
    ].join(";");
    button.addEventListener("click", onClick);
    return button;
  }

  function ensureBanner() {
    if (banner && banner.isConnected) return;
    banner = document.createElement("section");
    banner.id = "issue-draft-lifeboat-banner";
    banner.setAttribute("role", "status");
    banner.style.cssText = [
      "box-sizing:border-box",
      "margin:0 0 16px",
      "padding:12px 14px",
      "border:1px solid #d0d7de",
      "border-left:4px solid #1f6feb",
      "border-radius:8px",
      "background:#f6f8fa",
      "color:#24292f",
      "font:13px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
      "position:relative",
      "z-index:20"
    ].join(";");

    const heading = document.createElement("div");
    heading.textContent = "Issue Draft Lifeboat";
    heading.style.cssText = "font-weight:700;margin-bottom:3px";
    messageNode = document.createElement("div");
    messageNode.style.cssText = "margin-bottom:8px";
    actionsNode = document.createElement("div");
    actionsNode.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center";
    const privacy = document.createElement("div");
    privacy.textContent = "仅保存在此浏览器本机，不会上传。草稿最多保留 14 天。";
    privacy.style.cssText = "margin-top:8px;color:#57606a;font-size:11px";
    banner.append(heading, messageNode, actionsNode, privacy);
  }

  function placeBanner(fields) {
    ensureBanner();
    const form = fields.title.closest("form") || fields.body.closest("form");
    if (form) {
      if (banner.parentElement !== form) form.prepend(banner);
    } else if (banner.parentElement !== document.body) {
      document.body.prepend(banner);
    }
  }

  function setMessage(text, error) {
    if (!messageNode) return;
    messageNode.textContent = text;
    messageNode.style.color = error ? "#cf222e" : "#57606a";
  }

  function render() {
    if (!currentFields || !currentKey) return;
    placeBanner(currentFields);
    actionsNode.replaceChildren();
    const hasDraft = currentDraft && !Core.isExpired(currentDraft);
    const hasCurrentText = Boolean(
      currentFields.title.value.trim() || currentFields.body.value.trim()
    );

    if (hasDraft) {
      setMessage(
        "发现本机草稿（" + Core.formatSavedAt(currentDraft.savedAt) + "）。" +
          (hasCurrentText ? " 当前表单已有内容，不会覆盖。" : ""),
        false
      );
      const restore = makeButton("恢复草稿", restoreDraft, false);
      restore.disabled = hasCurrentText;
      if (hasCurrentText) {
        restore.style.opacity = "0.55";
        restore.style.cursor = "not-allowed";
      }
      actionsNode.append(restore);
      actionsNode.append(makeButton("删除本机草稿", deleteDraft, true));
    } else {
      setMessage("本机草稿保护已开启；输入内容后会自动保存。", false);
    }
  }

  function loadDraft() {
    const key = getKey();
    if (!key) return;
    currentKey = key;
    currentDraft = null;
    const generation = ++loadGeneration;
    chrome.storage.local.get(key, (result) => {
      if (generation !== loadGeneration || key !== currentKey) return;
      if (chrome.runtime.lastError) {
        setMessage("读取本机草稿失败：" + chrome.runtime.lastError.message, true);
        return;
      }
      const stored = result[key];
      if (stored && Core.isExpired(stored)) {
        chrome.storage.local.remove(key);
      } else if (stored && typeof stored.title === "string" && typeof stored.body === "string") {
        currentDraft = stored;
      }
      render();
    });
  }

  function setNativeValue(element, value) {
    const prototype = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor?.set) descriptor.set.call(element, value);
    else element.value = value;
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: null }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function restoreDraft() {
    if (!currentDraft || !currentFields) return;
    if (!Core.canRestore(currentDraft, currentFields.title.value, currentFields.body.value)) {
      render();
      return;
    }
    setNativeValue(currentFields.title, currentDraft.title);
    setNativeValue(currentFields.body, currentDraft.body);
    setMessage("草稿已恢复；你可以继续编辑。", false);
    queueSave();
  }

  function deleteDraft() {
    if (!currentKey) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    pendingSave = null;
    loadGeneration += 1;
    const key = currentKey;
    chrome.storage.local.remove(key, () => {
      if (chrome.runtime.lastError) {
        if (key === currentKey) setMessage("删除本机草稿失败：" + chrome.runtime.lastError.message, true);
        return;
      }
      if (key === currentKey) {
        currentDraft = null;
        render();
        setMessage("本机草稿已删除。", false);
      }
    });
  }

  function queueSave() {
    if (!currentKey || !currentFields) return;
    if (saveTimer) clearTimeout(saveTimer);
    loadGeneration += 1;
    pendingSave = { key: currentKey, fields: currentFields };
    saveTimer = setTimeout(flushSave, SAVE_DELAY_MS);
  }

  function flushSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    const snapshot = pendingSave;
    pendingSave = null;
    saveDraft(snapshot);
  }

  function saveDraft(snapshot) {
    if (!snapshot?.key || !snapshot?.fields) return;
    const { key, fields } = snapshot;
    const title = fields.title.value;
    const body = fields.body.value;
    if (!title.trim() && !body.trim()) {
      chrome.storage.local.remove(key, () => {
        if (chrome.runtime.lastError) {
          if (key === currentKey) setMessage("清除空草稿失败：" + chrome.runtime.lastError.message, true);
          return;
        }
        if (key === currentKey) {
          currentDraft = null;
          render();
        }
      });
      return;
    }
    if (title.length + body.length > Core.MAX_DRAFT_CHARS) {
      if (key === currentKey) setMessage("草稿超过 100,000 个字符，本机保护未保存本次更改。", true);
      return;
    }

    const draft = { title, body, savedAt: Date.now() };
    chrome.storage.local.set({ [key]: draft }, () => {
      if (chrome.runtime.lastError) {
        if (key === currentKey) setMessage("本机保存失败：" + chrome.runtime.lastError.message, true);
        return;
      }
      if (key !== currentKey) return;
      currentDraft = draft;
      render();
      setMessage("本机已保存（" + Core.formatSavedAt(draft.savedAt) + "）。", false);
    });
  }

  function bindFields(fields) {
    for (const field of [fields.title, fields.body]) {
      if (boundFields.has(field)) continue;
      boundFields.add(field);
      field.addEventListener("input", queueSave);
      field.addEventListener("change", queueSave);
      field.addEventListener("blur", flushSave);
    }
  }

  function setup() {
    if (!Core.isIssueNewPath(location.pathname)) {
      if (banner?.isConnected) banner.remove();
      currentFields = null;
      currentKey = null;
      currentDraft = null;
      return;
    }

    const fields = getFields();
    if (!fields) return;
    const key = getKey();
    if (!key) return;

    const fieldsChanged = !currentFields ||
      currentFields.title !== fields.title || currentFields.body !== fields.body;
    const keyChanged = key !== currentKey;
    if ((keyChanged || fieldsChanged) && saveTimer) flushSave();
    currentFields = fields;
    bindFields(fields);
    placeBanner(fields);

    if (keyChanged) {
      currentDraft = null;
      loadDraft();
    } else if (fieldsChanged) {
      render();
    }
  }

  const observer = new MutationObserver(setup);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSave();
  });
  window.addEventListener("pagehide", flushSave);
  setup();
  setInterval(() => {
    const path = location.pathname + location.search;
    if (path !== lastPath) {
      lastPath = path;
      setup();
    }
  }, 1000);
})();
