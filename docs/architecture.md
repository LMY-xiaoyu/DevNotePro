# DevNote Pro 架构说明

## 目标

DevNote Pro 按“主进程能力、前端业务状态、界面组件”拆分，避免把文件读写、窗口控制、快捷键、通知和笔记业务全部堆在 `App.tsx`。

## 分层

### Electron 主进程

`main.js` 负责系统能力：

- 创建主窗口、浮动笔记窗口和托盘。
- 管理本地文件读写、图片保存、设置保存。
- 通过 IPC 暴露受控能力给渲染进程。

### IPC 基础设施层

`services/ipcClient.ts` 是渲染进程访问主进程的唯一入口：

- 封装 `send`、`invoke`、`on`。
- 提供语义化方法，例如 `readNotes`、`saveNote`、`openNoteWindow`。
- 让业务代码不直接依赖 Electron 的具体暴露方式。

### 前端业务 hooks

`hooks/` 下放置可复用的业务和交互模块：

- `useNotePersistence`：笔记和文件夹保存策略，统一处理 IPC 与 localStorage 降级。
- `useToast`：全局提示队列。
- `useConfirmation`：确认弹窗状态。
- `useKeyboardShortcuts`：快捷键绑定。
- `useHorizontalWheel`：标签栏滚轮横向滚动。
- `useFloatingNoteLoader`：浮动窗口按需加载笔记。

### 领域工具

`utils/noteFactory.ts` 放置笔记对象创建逻辑：

- 普通空白笔记。
- 浮动窗口兜底笔记。
- 欢迎笔记。

### UI 组件层

`components/` 保持偏展示和交互：

- `Sidebar`、`NoteList`、`Editor` 等组件接收数据和回调。
- 不直接读写磁盘。
- 不直接控制 Electron 主进程。

### 应用组合层

`App.tsx` 负责装配：

- 组合 hooks、服务和组件。
- 保留当前页面布局。
- 处理跨模块流程，例如移动笔记、归档、打开浮动窗口。

## 后续演进方向

- 将笔记列表、标签页、文件夹操作继续拆为 `useNoteActions`、`useFolderActions`、`useTabActions`。
- 将 `App.tsx` 的主窗口和浮动窗口渲染拆成 `MainWorkspace` 与 `FloatingWorkspace`。
- 增加仓储层测试，覆盖保存、移动、归档、删除等高风险流程。
