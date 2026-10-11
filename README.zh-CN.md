# Issue Draft Lifeboat（GitHub Issue 草稿救生艇）

**语言：** [English](README.md) · [简体中文](README.zh-CN.md)

一款轻量、优先本地运行的 Chrome/Edge 扩展，可在 GitHub **新建 Issue** 页面保存可恢复的文本草稿。

## 功能

- 输入时稍作等待后，将 Issue 标题和正文保存到 `chrome.storage.local`。
- 按仓库和 Issue 模板分别保存草稿。
- 对应表单为空时提供**恢复草稿**按钮。
- 表单中已有文字时不会覆盖。
- 可手动删除已保存的草稿；标题和正文都清空后，也会删除保存的副本。
- 草稿保存 14 天后过期；标题与正文合计最多保存 100,000 个字符。

## 隐私与权限

草稿文本只保存在当前浏览器配置文件的本地扩展存储中。本项目没有服务器、分析代码、远程代码、同步权限或网络请求。扩展清单只申请 `storage` 权限，并且仅匹配 `https://github.com/<owner>/<repo>/issues/new...` 页面。

如果浏览器或扩展存储被清除或损坏，扩展无法恢复文本。请勿把它当作机密或敏感信息的备份。

## 本地测试安装

1. 下载或克隆本仓库。
2. 打开 `chrome://extensions`（Edge 用户打开 `edge://extensions`）。
3. 开启**开发者模式**。
4. 选择**加载已解压的扩展程序**，然后选中本项目目录。
5. 打开或刷新某个 GitHub 仓库的新建 Issue 表单，例如 `https://github.com/OWNER/REPO/issues/new`。
6. 输入标题或正文，等待约半秒，确认本地保存提示出现。测试恢复时，关闭并重新打开新建 Issue 标签页，再选择**恢复草稿**。

目前仍属早期版本。GitHub 可能会调整页面结构；如果保护提示横幅没有出现，请刷新新建 Issue 表单，并在提交问题时附上受影响页面的 URL（请先删除其中任何私有仓库信息）。

## 开发

需要 Node.js 18 或更高版本，以使用内置测试运行器；无需安装依赖。

```sh
npm test
node --check src/core.js
node --check src/content.js
```

## 支持范围与已知限制

- 支持 GitHub 网页端包含标题输入框和正文文本框的新建 Issue 表单；不支持评论、Pull Request、Discussions 或 GitHub Enterprise。
- 草稿仅保存在本机；如果浏览器或扩展存储被清除，不承诺能够恢复。
- 扩展不会提交 Issue、同步设备或上传草稿文本。
- Issue 成功提交后，如果不再需要保留的草稿，请在下一个匹配的新建 Issue 页面手动删除。扩展不会在提交时自动清除草稿，以免提交失败时丢失内容。

## 许可证

MIT，详见 [LICENSE](LICENSE)。
