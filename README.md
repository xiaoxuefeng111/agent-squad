# 龙虾军团 (Agent Squad)

基于 Claude Agent SDK 的多 Agent 协作系统，实现智能任务分发和协调执行。

## 功能特性

- **多Agent协作**: 协调者Agent调度专业Subagent完成任务
- **四种场景模板**: 软件开发、项目管理、内容创作、通用任务
- **自定义角色**: 支持用户自定义Agent角色和能力
- **三级权限模式**: 严格、标准、信任模式控制执行权限
- **实时可视化**: WebSocket驱动的Web界面展示Agent对话
- **本地数据存储**: SQLite持久化任务历史和对话记录
- **存储限制管理**: 1GB对话日志上限，10GB总存储上限

## 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    Web UI (Next.js)                  │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────┐ │
│  │  Task List    │  │  Task Detail  │  │ Chat Panel│ │
│  └───────────────┘  └───────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                         │ WebSocket
                         ▼
┌─────────────────────────────────────────────────────┐
│              Coordinator Agent                       │
│  ┌─────────────────────────────────────────────────┐│
│  │  Claude Agent SDK (Opus 4.6)                    ││
│  │  - 任务分析                                      ││
│  │  - 角色调度                                      ││
│  │  - 进度监控                                      ││
│  └─────────────────────────────────────────────────┘│
│              │                                       │
│              │ Subagent Dispatch                     │
│              ▼                                       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │Architect│ │Developer│ │Reviewer│ │ Tester │       │
│  └────────┘ └────────┘ └────────┘ └────────┘       │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              SQLite Storage                          │
│  - Tasks                                             │
│  - Chat Messages                                     │
│  - Configuration                                     │
└─────────────────────────────────────────────────────┘
```

## 安装

### 前置要求

- Node.js 18+
- npm 或 yarn
- Claude API Key (Anthropic)

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/yourusername/agent-squad.git
cd agent-squad

# 安装依赖
npm install

# 设置环境变量
export ANTHROPIC_API_KEY=your_api_key_here

# 运行开发服务器
npm run dev
```

## 使用指南

### 创建任务

1. 点击右上角"新任务"按钮
2. 填写任务标题和描述
3. 选择场景模板:
   - **软件开发**: 架构师 → 开发工程师 → 代码审查员 → 测试工程师
   - **项目管理**: 项目经理 → 协调员 → 进度跟踪员
   - **内容创作**: 内容研究员 → 内容创作者 → 编辑审核员 → 发布协调员
   - **通用任务**: 任务分析师 → 执行者 → 验证员
4. 选择权限模式:
   - **严格**: 所有操作需确认，只读文件
   - **标准**: 常规操作自主执行，敏感操作需确认
   - **信任**: 全自主执行，无需确认
5. 设置工作目录路径
6. 点击"创建任务"

### 执行任务

1. 在任务列表中选择任务
2. 点击"开始执行"
3. 观察右侧聊天面板实时显示Agent对话
4. 可随时暂停、继续或停止任务

### 权限模式说明

| 模式 | 文件读取 | 文件写入 | 命令执行 | 用户确认 |
|------|----------|----------|----------|----------|
| 严格 | ✓ | ✗ | ✗ | 所有操作 |
| 标准 | ✓ | ✓ | 安全命令 | 敏感操作 |
| 信任 | ✓ | ✓ | ✓ | 无需确认 |

## 项目结构

```
agent-squad/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── tasks/          # 任务管理
│   │   │   ├── templates/      # 模板管理
│   │   │   ├── messages/       # 消息获取
│   │   │   └── execute/        # Agent执行控制
│   │   ├── page.tsx            # 主页面
│   │   ├── layout.tsx          # 根布局
│   │   └── globals.css         # 全局样式
│   ├── components/             # React组件
│   │   ├── layout/             # 布局组件
│   │   ├── task/               # 任务组件
│   │   └── chat/               # 聊天组件
│   ├── lib/                    # 核心库
│   │   ├── agents/             # Agent实现
│   │   │   └── coordinator.ts  # 协调者Agent
│   │   ├── storage/            # 存储模块
│   │   │   ├── database.ts     # SQLite数据库
│   │   │   └── config.ts       # 配置管理
│   │   └── websocket/          # WebSocket
│   │       ├── server.ts       # 服务器端
│   │       └ hooks.ts          # React hooks
│   └── types/                  # TypeScript类型
│       └── index.ts
├── data/                       # 数据目录
│   ├── tasks.db                # SQLite数据库
│   └── config.json             # 配置文件
├── docs/                       # 文档
│   └── superpowers/            # 计划文档
└── tests/                      # 测试文件
```

## API 文档

### Tasks API

- `GET /api/tasks` - 获取所有任务
- `GET /api/tasks?id=<taskId>` - 获取单个任务
- `POST /api/tasks` - 创建任务
- `PUT /api/tasks` - 更新任务状态

### Templates API

- `GET /api/templates` - 获取所有模板
- `GET /api/templates?id=<templateId>` - 获取单个模板
- `POST /api/templates` - 创建/更新模板
- `DELETE /api/templates?id=<templateId>` - 删除模板

### Execute API

- `GET /api/execute?taskId=<taskId>` - 检查执行状态
- `POST /api/execute` - 控制执行 (start/pause/resume/stop)

### Messages API

- `GET /api/messages?taskId=<taskId>` - 获取任务消息

## 存储限制

系统默认配置:
- 对话日志上限: 1GB
- 任务历史上限: 1000条
- 总存储上限: 10GB

超过限制时会自动清理最早的记录。

## 开发

```bash
# 运行开发服务器
npm run dev

# 运行测试
npm test

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request!