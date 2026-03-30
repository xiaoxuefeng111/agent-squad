# 龙虾军团 (Agent Squad)

基于 Claude Agent SDK 的多 Agent 协作系统，实现智能任务分发和协调执行。

## 功能特性

- **多Agent协作**: 协调者Agent调度专业Subagent完成任务
- **四种场景模板**: 软件开发、项目管理、内容创作、通用任务
- **内置Skills系统**: 遵循superpowers模式的技能包，强制头脑风暴流程
- **自定义Skills导入**: 支持导入本地skill目录，与团队共享
- **多API提供商**: 支持Anthropic、阿里云百炼、自定义API
- **实时连接状态**: 显示API连接状态和当前模型
- **三级权限模式**: 严格、标准、信任模式控制执行权限
- **实时可视化**: WebSocket驱动的Web界面展示Agent对话
- **本地数据存储**: SQLite持久化任务历史和对话记录

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
│  │  - Skills调用                                   ││
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
│              Skills System                           │
│  skills/built-in/     skills/custom/                │
│  ├── brainstorming/   └── my-skill/                 │
│  ├── writing-plans/       └── SKILL.md              │
│  ├── tdd-development/                                 │
│  └── ...                                              │
└─────────────────────────────────────────────────────┘
```

## 安装

### 环境要求

#### 必需环境

| 环境 | 版本要求 | 说明 |
|-----|---------|------|
| Node.js | 18+ | 运行环境，必需 |
| npm | 9+ | 包管理器，必需 |
| API Key | - | Claude/阿里云百炼 API密钥 |

#### 可选环境（数据库持久化）

| 环境 | 说明 | Windows安装方式 |
|-----|------|----------------|
| Python 3.x | 编译原生模块 | [python.org](https://www.python.org/downloads/) 安装时勾选 "Add Python to PATH" |
| VS Build Tools | C++编译器 | [VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) 选择 "Desktop development with C++" |

**注意**: 如果不安装 Python 和编译工具，应用会使用内存存储，数据在重启后丢失。

### 快速安装

#### Windows

```batch
# 1. 克隆仓库
git clone https://github.com/yourusername/agent-squad.git
cd agent-squad

# 2. 运行启动脚本（自动检测环境并安装）
start.bat
```

首次运行 `start.bat` 会：
- 检测 Node.js/npm 是否安装
- 检测 Python 是否可用（可选）
- 自动安装依赖（根据环境选择完整安装或备用安装）
- 提示配置 API Key

#### macOS / Linux

```bash
# 1. 克隆仓库
git clone https://github.com/yourusername/agent-squad.git
cd agent-squad

# 2. 运行启动脚本
chmod +x start.sh
./start.sh
```

#### 手动安装选项

```batch
# 完整安装（需要 Python + 编译工具）
npm install

# 备用安装（跳过原生编译，使用内存存储）
npm install --ignore-scripts

# 启动
npm run dev
```

### Python 配置指南

#### Windows

1. 下载 Python: https://www.python.org/downloads/
2. **重要**: 安装时勾选 **"Add Python to PATH"**
3. 验证安装:
   ```batch
   python --version
   # 应显示: Python 3.x.x
   ```
4. 安装 VS Build Tools:
   - 下载: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - 选择 "Desktop development with C++"
5. 重新编译原生模块:
   ```batch
   npm rebuild better-sqlite3
   ```

#### macOS

```bash
# 安装 Python (通常已预装)
brew install python3

# 安装编译工具
xcode-select --install

# 重新编译
npm rebuild better-sqlite3
```

#### Linux (Ubuntu/Debian)

```bash
# 安装 Python 和编译工具
sudo apt install python3 build-essential

# 重新编译
npm rebuild better-sqlite3
```

### 常见问题

#### Python 未正确安装

症状: `start.bat` 显示 "Python: NOT FOUND"
解决:
1. 确保安装时勾选了 "Add Python to PATH"
2. 重新打开终端（CMD/PowerShell）
3. 运行 `python --version` 验证

#### npm install 失败

症状: `gyp ERR! find Python` 或编译错误
解决:
```batch
# 方案1: 安装 Python + VS Build Tools 后重新运行
npm rebuild better-sqlite3

# 方案2: 使用备用安装（数据不持久化）
npm install --ignore-scripts
```

#### 数据丢失

症状: 重启后任务历史消失
原因: 未安装 Python，使用了内存存储
解决: 安装 Python + VS Build Tools，运行 `npm rebuild better-sqlite3`

## 使用指南

### 配置API

1. 点击右上角"设置"按钮
2. 选择API提供商:
   - **Anthropic**: 使用Claude官方API
   - **阿里云百炼**: 使用通义千问等模型
   - **自定义**: 输入自定义Base URL
3. 输入API Key
4. 选择模型（阿里云默认qwen-plus）
5. 点击"测试连接"验证配置

### 创建任务

1. 点击右上角"新任务"按钮
2. 填写任务标题和描述
3. 选择场景模板
4. **强制头脑风暴**: 系统自动执行brainstorming skill进行分析
5. 完成分析后确认创建任务

### 执行任务

1. 在任务列表中选择任务
2. 点击"开始执行"
3. 观察右侧聊天面板实时显示Agent对话
4. 可随时暂停、继续或停止任务

### Skills管理

1. 点击"Skills"按钮查看所有可用技能
2. 内置技能（蓝色标签）不可删除或修改
3. 点击"导入Skill目录"添加自定义技能
4. 导入的技能存放在`skills/custom/`目录

## Skills系统

### 内置Skills

系统内置以下superpowers风格技能：

| Skill | 说明 | 触发方式 |
|-------|------|----------|
| brainstorming | 需求分析和设计（创建任务强制执行） | 手动 |
| writing-plans | 编写实现计划 | 自动 |
| executing-plans | 执行计划任务 | 自动 |
| tdd-development | 测试驱动开发 | 自动 |
| code-review | 代码审查 | 自动 |
| debugging | 调试排查 | 手动 |
| agent-browser | 浏览器自动化 | 手动 |
| pdf | PDF处理 | 手动 |
| pptx | PPT处理 | 手动 |

### Skill目录结构

```
skills/
├── built-in/                    # 内置skill（只读）
│   ├── brainstorming/
│   │   ├── SKILL.md            # 主文件（必须有）
│   │   └── visual-companion.md # 辅助文件
│   └── ...
└── custom/                      # 用户导入的skill
    └── my-skill/
        └── SKILL.md
```

### 导入自定义Skill

1. 准备skill目录，包含SKILL.md文件
2. 点击"Skills" → "导入Skill目录"
3. 输入skill目录路径
4. 扫描并导入

SKILL.md格式：
```markdown
---
name: my-skill
description: 技能描述
type: custom
trigger: manual
---

# Skill Title

## Checklist

- [ ] 步骤1
- [ ] 步骤2
- [ ] 步骤3
```

## 项目结构

```
agent-squad/
├── skills/                     # Skills目录
│   ├── built-in/               # 内置技能包
│   └── custom/                 # 自定义技能包
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── skills/         # Skills API
│   │   │   ├── skill-execute/  # Skill执行
│   │   │   └── ...
│   │   └── page.tsx            # 主页面
│   ├── components/             # React组件
│   │   ├── skills/             # Skills组件
│   │   ├── layout/             # 布局组件
│   │   └── task/               # 任务组件
│   ├── lib/
│   │   ├── skills/             # Skill加载器
│   │   │   └── loader.ts
│   │   ├── agents/             # Agent实现
│   │   └── storage/            # 存储模块
│   └── types/                  # TypeScript类型
│       └── skills.ts
├── docs/                       # 文档
└── data/                       # 数据目录
```

## API文档

### Settings API

- `GET /api/settings` - 获取当前设置
- `POST /api/settings` - 保存设置
- `POST /api/test-connection` - 测试API连接

### Skills API

- `GET /api/skills` - 获取所有skills
- `GET /api/skills?id=<skillId>` - 获取单个skill
- `POST /api/skills/import` - 扫描/导入skill目录
- `DELETE /api/skills/import?id=<skillId>` - 删除自定义skill

### Skill Execute API

- `POST /api/skill-execute` - 执行skill步骤

### Tasks API

- `GET /api/tasks` - 获取所有任务
- `POST /api/tasks` - 创建任务

## 开发

```bash
# 运行开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request!