# 山海浮生 2026 · 炁 QI

## 快速入口

记住这个仓库即可；以下链接可以直接打开。

| 入口 | 用途 |
| --- | --- |
| **[打开网页 / WebXR 演示](https://ewanqian.github.io/shanhaifusheng-2026/)** | 电脑、手机预览；Quest 浏览器进入 VR |
| **[打开作品专题](https://ewanqian.github.io/shanhaifusheng-2026/project.html)** | 作品、导演、演出信息与杂志报道 |
| [杂志原页与海报](./assets/editorial/) | 查看项目图片与报道原页 |
| [杂志标题识别](./PRESS_OCR.md) | 查看标题及报道归属说明 |
| [仓库首页](https://github.com/ewanqian/shanhaifusheng-2026) | 统一入口，收藏此地址即可 |
| [Pages 发布状态](https://github.com/ewanqian/shanhaifusheng-2026/deployments) | 查看云端部署记录 |

### Quest 头显测试

1. 在 **Meta Quest Browser** 中打开上方“网页 / WebXR 演示”。
2. 等待模型载入，点击 **ENTER VR**，允许浏览器请求的沉浸体验权限。进入 VR 后自动开始 110 秒序列。
3. VR 中捏合或轻按扳机只产生反馈，不会跳过剧情；无需重复点击或等待启动提示。桌面使用“开始体验”，也可用“下一幕（桌面预览）”跳转。
4. 体验后点“关于作品”阅读专题。云端更新后刷新同一网址即可，无需重新安装应用。

若显示 **VR NOT SUPPORTED**，当前浏览器或设备未提供沉浸式 WebXR；仍可使用桌面网页演示。APK 尚未发布。

---
《山海浮生 III｜炁 QI》XR 空间序章概念演示。导演：程雨阳；SET Production。

浏览器 / WebXR；本地运行依赖已打包，无运行时 CDN。

## 体验
开始 → 一石呼吸 → 1 / 3 / 7 / 18 分批显现 → 黑石慢转与缓慢成环 → 山海展开 → 归一 / 作品介绍。约 110 秒。可点击石头或“下一幕”；桌面拖动环视。声音需点击开始后播放。

Quest Browser 通过 HTTPS 打开 Pages 链接，点击 ENTER VR。控制器扳机、WebXR select 捏合事件和指尖靠近检测已接入；尚未完成真机验证。当前为 VR 白空间体验，并非已实现相机透视的 MR。

## 开发
`npm ci` → `npm run build`；使用静态 HTTP 服务器预览。GitHub Pages 从 main 分支根目录发布。所有资源使用相对路径，支持项目子目录。

## 边界
不包含生命数据、机械臂、眼球追踪或空间锚定接入。桌面与 VR 使用同一套立体几何 / 距离高度雾；无 VR 景深后处理。未保证 Quest 帧率、离线首访或中国大陆网络可达性。

## 素材权利
代码演示和场景发布不构成素材库授权。演出文字与配乐由项目提供；山脉由项目 terrain 派生；岩石由本地 polygoniq botaniq 扫描资产制作，仅作为本体验的组成部分。第三方模型、纹理、音乐不适用代码开源许可，请勿提取再分发。Three.js / GSAP 见各自许可。

专题入口：`project.html`。杂志原页位于 `assets/editorial`，标题识别见 `PRESS_OCR.md`。

## XR 修订 02

主石尺寸 0.65 米，距初始观看位置约 2.5 米；场景按入场视线定位。序列由 WebXR 帧循环按真实经过时间驱动，避免普通网页动画时钟在 VR 中停顿。结束后停留，捏合进入图文阅读卡；不会自动跳到另一网页。阅读卡正文为原字号约三分之一，并包含项目图片。

验证：`npm test` 覆盖时间边界、主石距离、持续捏合防重复触发；另使用 Meta IWER 模拟 Quest 3 会话检查场景。模拟器不随公开发布包加载，仍需 Quest 真机复核。
