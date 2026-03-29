#!/bin/bash

# 龙虾军团启动脚本

echo "正在启动龙虾军团..."

# 检查 .env.local 是否存在
if [ ! -f ".env.local" ]; then
    echo "警告: .env.local 文件不存在"
    echo "请创建 .env.local 并设置 ANTHROPIC_API_KEY"
    echo "示例: echo 'ANTHROPIC_API_KEY=your_key' > .env.local"
fi

# 启动 Next.js 开发服务器
echo "启动 Next.js 服务器 (端口 3000)..."
npm run dev &

# 等待服务启动
sleep 3

echo ""
echo "========================================"
echo "  龙虾军团已启动"
echo "========================================"
echo ""
echo "  Web界面: http://localhost:3000"
echo "  WebSocket: ws://localhost:3001"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo "========================================"
echo ""

# 等待子进程
wait