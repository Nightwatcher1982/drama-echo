#!/bin/bash

echo "🔍 验证云函数部署状态..."

# 进入项目目录
cd /Users/xiang.huang/Documents/DramaEcho/drama-echo/cloudfunctions/createOrder

echo "📋 检查本地文件状态:"
echo "   - 文件修改时间: $(ls -la index.js | awk '{print $6, $7, $8}')"
echo "   - 文件大小: $(ls -la index.js | awk '{print $5}') bytes"

echo ""
echo "🔍 检查配置文件:"
if [ -f "secureConfig.js" ]; then
    echo "   ✅ secureConfig.js 存在"
    echo "   - 环境设置: $(grep 'IS_DEVELOPMENT' secureConfig.js | head -1)"
    echo "   - AppID: $(grep 'appid:' secureConfig.js | head -1)"
    echo "   - 商户号: $(grep 'mch_id:' secureConfig.js | head -1)"
    echo "   - API密钥长度: $(grep 'api_key:' secureConfig.js | head -1 | wc -c)"
    echo "   - 回调URL: $(grep 'notify_url:' secureConfig.js | head -1)"
else
    echo "   ❌ secureConfig.js 不存在"
fi

echo ""
echo "📦 检查依赖:"
if [ -f "package.json" ]; then
    echo "   ✅ package.json 存在"
    echo "   - 依赖数量: $(cat package.json | grep -c '"wx-server-sdk"')"
else
    echo "   ❌ package.json 不存在"
fi

echo ""
echo "🚀 部署说明:"
echo "1. 打开微信开发者工具"
echo "2. 右键点击 'drama-echo/cloudfunctions/createOrder' 文件夹"
echo "3. 选择 '上传并部署：云端安装依赖'"
echo "4. 等待部署完成"

echo ""
echo "🔍 部署后验证:"
echo "重新测试复购功能，应该能看到:"
echo "   🚀 云函数已重新部署 - 版本验证"
echo "   🔍 当前时间: [时间戳]"
echo "   🔍 环境设置: 生产环境"

echo ""
echo "⚠️  如果看不到上述日志，说明云函数还没有正确部署"
echo "请重新部署云函数，确保选择 '上传并部署：云端安装依赖'"



