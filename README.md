# 山海浮生 2026 · 炁 QI

《山海浮生 III｜炁 QI》网页 / WebXR 空间预览。导演：程雨阳（Yuyang Cheng）；出品：旁观实验剧场 SET。

## 直接打开

| 入口 | 用途 |
| --- | --- |
| **[新版 0.3.2](https://ewanqian.github.io/shanhaifusheng-2026/versions/v0.3.2/)** | 连续淡入淡出、缓慢悬山、无 HUD 全屏、独立 VR / MR 透视入口 |
| [0.3.1 fallback](https://ewanqian.github.io/shanhaifusheng-2026/versions/v0.3.1/) | 上一版保持原样 |
| [0.3.2 VR / MR](https://ewanqian.github.io/shanhaifusheng-2026/versions/v0.3.2/) | 同一页面选择 VR 或 MR 透视 |
| [作品专题](https://ewanqian.github.io/shanhaifusheng-2026/versions/v0.3.2/project.html) | 作品、导演、演出信息、芭莎艺术报道原页 |
| **[0.3.0 fallback](https://ewanqian.github.io/shanhaifusheng-2026/versions/v0.3.0/)** | 上一版保持原样 |
| **[0.2.0 fallback](https://ewanqian.github.io/shanhaifusheng-2026/?v=0.2.0)** | 根目录旧版保持原样 |
| [本轮改动与验证](./docs/RELEASE_0.3.2.md) | 已完成项、限制、离线测试步骤 |
| [空间产品研究](./docs/SPATIAL_PRODUCT_REVIEW.md) | VPE、两种空间、体验节奏与后续执行顺序 |
| [问题与反馈](https://github.com/ewanqian/shanhaifusheng-2026/issues) | 中期审核与待办 |
| [Pages 发布状态](https://github.com/ewanqian/shanhaifusheng-2026/deployments) | 云端部署记录 |

## Quest 使用

联网打开新版链接，等加载完成，再点“进入 MR 空间”或“进入 VR 空间”。进入后自动播放 90 秒。握键或指向“停留”捏合可暂停章节推进，音乐继续循环；再次操作继续。结束后可重播、阅读档案或退出。

MR 默认持续透视，需头显浏览器支持 immersive-ar；不支持时入口禁用，选择 VR 即可。未接入房间网格、空间锚点或眼动。模拟验证通过，真实透视与帧率仍待 Quest 测试。

桌面点击“全屏 · 无 HUD”进入纯画面。Esc 返回；H 切换界面，空格停留/继续，R 重播。浏览器未允许系统级全屏时仍可使用无 HUD 窗口预览。

## 现场离线

联网时点击 **准备离线**，等待 **离线已就绪**。关闭网络、刷新同一版本网址（新版需重新准备缓存）并完整体验一次。模型、三段配乐、专题图片均在缓存清单内。缓存可能被系统回收，展前须在实际头显验证。

目前没有 APK。此方案需首次联网缓存，不能保证新设备首次离线启动。

## 音乐

已有配乐试剪为三段 28 秒循环，循环接缝交叠 4 秒，章节之间渐变衔接。选段来自现有前 115 秒导出素材；原始长配乐不修改。作者试听确认尚未完成。

## 版本保护

每次升级放入独立 `versions/` 子目录。0.3.2 不替换 0.3.1、0.3.0 或根目录 0.2.0 的页面、脚本、模型和音乐。收藏此仓库即可找到全部入口。

## 开发与验证

当前根目录的本地工作副本用于开发；线上根网址保留 0.2.0，请勿直接整目录推送覆盖。

```powershell
cd versions/v0.3.2
node build.mjs
node --test tests/*.test.mjs
```

依赖锁定在 package-lock.json。网页运行不依赖外部 CDN。第三方资产说明见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
