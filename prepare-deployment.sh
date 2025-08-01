#!/bin/bash

# 德州扑克AI项目部署准备脚本
echo "🚀 开始准备部署..."

# 检查必要文件
echo "📋 检查部署配置文件..."
files=("vercel.json" "server/railway.json" ".env.example" "server/.env.example" "DEPLOYMENT.md")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 缺失"
        exit 1
    fi
done

# 检查依赖
echo "📦 检查项目依赖..."
if [ ! -d "node_modules" ]; then
    echo "📥 安装前端依赖..."
    npm install --legacy-peer-deps
fi

if [ ! -d "server/node_modules" ]; then
    echo "📥 安装后端依赖..."
    cd server && npm install && cd ..
fi

# 测试构建
echo "🏗️ 测试构建..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ 构建测试成功"
else
    echo "❌ 构建测试失败"
    exit 1
fi

# 清理构建产物
rm -rf build

echo ""
echo "🎯 部署准备完成！"
echo ""
echo "📝 接下来的步骤："
echo "1. 创建GitHub仓库"
echo "2. 推送代码: git add . && git commit -m 'Deploy setup' && git push"
echo "3. 按照 DEPLOYMENT.md 指南操作"
echo ""
echo "📖 详细指南: cat DEPLOYMENT.md"