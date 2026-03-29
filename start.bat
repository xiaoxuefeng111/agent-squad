@echo off
chcp 65001 >nul
echo 正在启动龙虾军团...

REM 检查 .env.local 是否存在
if not exist .env.local (
    echo 警告: .env.local 文件不存在
    echo 请创建 .env.local 并设置 ANTHROPIC_API_KEY
    echo 示例: echo ANTHROPIC_API_KEY=your_key ^> .env.local
)

REM 启动 Next.js 开发服务器
echo 启动 Next.js 服务器 (端口 3000)...
start "龙虾军团 - Next.js" cmd /k npm run dev

timeout /t 3 >nul

echo.
echo ========================================
echo   龙虾军团已启动
echo ========================================
echo.
echo   Web界面: http://localhost:3000
echo   WebSocket: ws://localhost:3001
echo.
echo   关闭窗口可停止服务
echo ========================================
echo.

pause