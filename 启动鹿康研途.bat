@echo off
chcp 65001 >nul
title 鹿康研途 - AI考研规划师
echo [鹿康研途] 正在启动...
echo.

:: 进入当前目录
cd /d "%~dp0"

:: 检查依赖
if not exist "node_modules" (
    echo [首次运行] 正在安装依赖...
    npm install
    echo.
)

:: 启动后端
echo [启动] 后端服务...
start /B node server.js

:: 等待启动
timeout /t 3 /nobreak >nul

:: 打开浏览器
echo [打开] 浏览器...
start http://localhost:3000

echo.
echo [成功] 鹿康研途已启动
echo 浏览器地址: http://localhost:3000
echo.
echo 关闭此窗口不会停止服务器
echo 如需停止，请打开任务管理器结束 node.exe
echo.
pause
