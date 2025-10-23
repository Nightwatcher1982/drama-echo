#!/bin/bash

# 部署云函数脚本
echo "🚀 开始部署云函数..."

# 进入项目目录
cd /Users/xiang.huang/Documents/DramaEcho/drama-echo

# 部署 createOrder 云函数
echo "📦 部署 createOrder 云函数..."
cd cloudfunctions/createOrder
npm install
echo "✅ createOrder 云函数准备完成"

# 返回项目根目录
cd ../..

echo "🎯 部署完成！"
echo "请在微信开发者工具中右键点击 cloudfunctions/createOrder 文件夹"
echo "选择 '上传并部署：云端安装依赖' 来部署云函数"



