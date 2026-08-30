# Pensieve 微信公众号推文包

用于「一和札记」公众号的「创造」合集。

## 推荐发布信息

- **标题**：我把《哈利·波特》的“冥想盆”，做成了一款私人记忆软件
- **备选标题 A**：我花了几个月，把“冥想盆”搬进了现实
- **备选标题 B**：如果记忆可以被放进水里，我做了一只现实中的冥想盆
- **摘要**：保存文字、照片、视频与声音，用 AI 整理情绪和线索，通过一句模糊的描述找回往事，再把一整段时间汇聚成报告。
- **合集**：创造
- **作者**：一和
- **封面**：`assets/cover-900x383.jpg`（主界面原图裁切，无附加文字）
- **方形分享图**：`assets/cover-square-1080.jpg`
- **阅读原文**：https://github.com/YiheHuang/Pensieve/releases/latest

## 文件

- `article.md`：内容审校与长期保存稿。
- `article-wechat.html`：明亮水色排版稿，可在浏览器打开后复制正文。
- `Pensieve-公众号推文-可导入版.docx`：公众号后台直接导入版；正文各功能段落均配图，其中三处保留原始 GIF。
- `assets/home.jpg`：脱敏演示主页。
- `assets/demo-capture.gif`：记忆提取与魔杖入水演示。
- `assets/demo-search.gif`：自然语言沉浸检索演示。
- `assets/demo-time-echoes.gif`：时光回响分页阅读演示。
- `assets/feature-emotions.jpg`：主情绪、副情绪与标准情绪光谱示意。
- `assets/feature-gallery.jpg`：记忆长廊与珍藏界面。
- `assets/feature-backup.jpg`：备份与迁徙界面。
- `assets/feature-settings.jpg`：偏好、AI 与本地守护界面。
- `assets/feature-use-cases.jpg`：Pensieve 使用场景示意。
- `assets/feature-start.jpg`：锁定与唤醒界面。
- `assets/cover-900x383.jpg`：公众号封面。
- `assets/cover-square-1080.jpg`：方形分享图。

## 发布步骤

1. 在公众号后台新建图文，选择导入 `Pensieve-公众号推文-可导入版.docx`。
2. 填写标题、作者、摘要和“创造”合集。
3. 上传 `assets/cover-900x383.jpg` 作为封面。
4. 检查导入后的三张 GIF、六张功能配图、段落间距和外部链接；如后台将动图转为静态图，直接以素材目录中的原始 GIF 替换该图片。
5. 将“阅读原文”设置为最新 Release 地址。
6. 发送手机预览，确认正文、动图与链接后发布。

## 动图参数

三张 GIF 均为 720×405、8 fps、短循环，并控制在 2 MB 内，适合直接嵌入图文。若公众号后台重新压缩后出现色阶断层，优先保留 `demo-time-echoes.gif`，其余两处可换用对应静态首帧。

静态首帧分别为 `demo-capture-poster.jpg`、`demo-search-poster.jpg` 与 `demo-time-echoes-poster.jpg`。

## 隐私处理

演示使用浏览器开发模式的虚构记忆与称呼“旅人”，不含真实记忆、附件、PIN、API 密钥或本机路径。
