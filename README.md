# Issue Draft Lifeboat

**Language:** [English](README.md) · [简体中文](README.zh-CN.md)

A tiny local-first Chrome/Edge extension that keeps a recoverable copy of text entered on GitHub's **new issue** page.

## What it does

- Saves the issue title and body to `chrome.storage.local` after a short pause while you type.
- Separates drafts by repository and issue template.
- Offers a **Restore draft** button when the matching form is empty.
- Never fills over text already in the form.
- Lets you remove a saved draft manually. Emptying both fields also removes the saved copy.
- Expires saved drafts after 14 days and caps the combined title/body at 100,000 characters.

## Privacy and permissions

Draft text stays in this browser profile's local extension storage. This project has no server, analytics, remote code, sync permission, or network requests. The manifest asks for `storage` and matches only `https://github.com/<owner>/<repo>/issues/new...` pages. The extension cannot recover text if browser/extension storage is cleared or corrupted. Do not treat it as a backup for secrets or sensitive information.

## Install for local testing

1. Download or clone this repository.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select this project directory.
5. Open or reload a GitHub repository's new issue form, for example `https://github.com/OWNER/REPO/issues/new`.
6. Type a title or body. Wait about half a second for the local save indicator. To test recovery, close and reopen the new-issue tab, then choose **Restore draft**.

This is an early release. GitHub may change its page markup; if the protection banner does not appear, reload the new-issue form and file an issue with the affected page URL (remove any private repository details first).

## Development

Requires Node.js 18 or newer for the built-in test runner. No dependencies are needed.

```sh
npm test
node --check src/core.js
node --check src/content.js
```

## Scope and known limitations

- Supports GitHub's web new-issue form with a title input and body textarea; it does not cover comments, pull requests, discussions, or GitHub Enterprise.
- The extension stores drafts locally and does not promise recovery after storage is cleared.
- It does not submit issues, sync devices, or upload draft text.
- After a successful issue submission, manually remove the retained draft from the next matching new-issue page if it is no longer useful. The extension deliberately does not clear on submit because a failed submission should not destroy the draft.

## License

MIT. See [LICENSE](LICENSE).
