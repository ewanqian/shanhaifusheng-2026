# 0.3.2 — 连续转场、缓慢悬山、无 HUD 与 MR 透视

[新版入口](https://ewanqian.github.io/shanhaifusheng-2026/versions/v0.3.2/) · [0.3.1 fallback](https://ewanqian.github.io/shanhaifusheng-2026/versions/v0.3.1/)

## 改动

- 主石原本只在动画结束时改变 visible，实际材质始终完全不透明。现在主石按动画透明度淡出/淡入，石场有独立的整体淡出通道，不再倒放出生序列逐个撤掉。透明度控制真实 alpha，不再把黑石染白作为消失效果。
- 双面悬山缓慢前后往返：幅度 ±0.8 米、周期 50 秒，最高速度约 0.101 米/秒。远层带相位差。只移动山体，镜头与用户位置不动。
- 默认隐藏章节、状态标题、Logo 和时间条。空间中仅保留操作提示；提示与停留按钮前移至约 1.65 米。
- “全屏 · 无 HUD”隐藏全部 DOM 界面和空间提示，并请求浏览器 Fullscreen。浏览器不允许系统级全屏时，仍保留无 HUD 的窗口预览。Esc 返回界面，H 切换界面，空格停留/继续，R 重播。
- VR 与 MR 分成独立入口。MR 默认持续透视，移除自动遮住现实的白球、地面和白雾片；虚拟石头与山脉叠加现实环境。需要旧式由现实进入白空间的流程，可使用 `?portal=1` 后点击 MR。
- 离线缓存仍按版本隔离；需要重新为 0.3.2 点击“准备离线”。不复用旧版缓存覆盖新版。

## 透视边界

MR 使用 `immersive-ar` 会话和透明画布，运行环境需支持。合成方式由头显的 [environmentBlendMode](https://developer.mozilla.org/en-US/docs/Web/API/XRSession/environmentBlendMode) 决定；[Meta Browser 的混合现实文档](https://developers.meta.com/vr/documentation/web/webxr-mixed-reality/)说明该入口。网页没有读取摄像头原图、房间网格或空间锚点。

模拟器已确认 `immersive-ar / alpha-blend`，并跑通完整序列；真实摄像头透视、透明物体排序、双面山体帧率仍须在 Quest Browser 验证。

## 验证

- JS 语法与打包通过，9 项单元测试通过。
- 旧版时间、捏合、音频回放测试保留；新增全部 12 块石头连续淡出及山体速度/位移边界检查。
- 模拟 MR 全部五幕运行至 90 秒，四张阅读图片载入。
- 转场在 43.0007 秒停留检查：主石和石场透明度均为 0.691215，12 块石头仍可见，确认使用连续过渡。
- 无 HUD 状态下 DOM 可见文字为空，Esc 可恢复；当前内置浏览器未批准系统级 Fullscreen，因此不声称原生全屏已在此环境验证。
- 本机 npm 子进程找不到 node，使用已安装 node 直接运行构建与测试；没有重装或修改全局环境。

0.3.1、0.3.0 与根目录 0.2.0 保留。
