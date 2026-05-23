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

- `useAppBootstrap`：应用启动加载、IPC 订阅、欢迎笔记和浮动窗口初始数据。
- `useNoteActions`：笔记更新、删除、批量删除、置顶、移动、标签和独立窗口动作。
- `useFolderActions`：文件夹创建、重命名、删除和文件夹弹窗状态。
- `useTabActions`：标签页选择、关闭、右键菜单和拖拽分离窗口。
- `useSettingsSync`：深色模式、窗口置顶状态同步和设置保存。
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

- 持有应用顶层状态。
- 组合 hooks、服务和视图。
- 连接主窗口、浮动窗口、弹窗层和上下文菜单。

### 视图层

`views/` 放置页面级组合组件：

- `MainWorkspace`：主窗口三栏布局。
- `FloatingWorkspace`：独立笔记窗口布局。
- `EditorTabs`：编辑器标签栏。

## 后续演进方向

- 继续拆 `main.js` 主进程：窗口管理、托盘、存储、IPC handler 分文件。
- 清理或重构 `contexts/NoteContext.tsx`，避免和 `App.tsx` 形成两套状态模型。
- 将 `Editor` 的图片粘贴保存逻辑抽到专用 hook 或 service。
- 增加仓储层测试，覆盖保存、移动、归档、删除等高风险流程。
