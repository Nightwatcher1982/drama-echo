#!/bin/bash

echo "🚀 开始重新部署 createOrder 云函数..."

# 进入项目目录
cd /Users/xiang.huang/Documents/DramaEcho/drama-echo/cloudfunctions/createOrder

echo "📦 检查配置文件..."
if [ -f "secureConfig.js" ]; then
    echo "✅ secureConfig.js 存在"
    echo "🔍 检查配置内容:"
    echo "   - AppID: $(grep 'appid:' secureConfig.js | head -1)"
    echo "   - 商户号: $(grep 'mch_id:' secureConfig.js | head -1)"
    echo "   - API密钥长度: $(grep 'api_key:' secureConfig.js | head -1 | wc -c)"
    echo "   - 回调URL: $(grep 'notify_url:' secureConfig.js | head -1)"
    echo "   - 环境设置: $(grep 'IS_DEVELOPMENT:' secureConfig.js | head -1)"
else
    echo "❌ secureConfig.js 不存在"
    exit 1
fi

echo ""
echo "📋 部署说明:"
echo "1. 打开微信开发者工具"
echo "2. 右键点击 'drama-echo/cloudfunctions/createOrder' 文件夹"
echo "3. 选择 '上传并部署：云端安装依赖'"
echo "4. 等待部署完成"
echo ""
echo "🔍 部署后测试步骤:"
echo "1. 重新测试复购功能"
echo "2. 查看控制台日志，应该能看到详细的调试信息"
echo "3. 如果还有签名错误，检查微信支付商户平台的回调URL配置"
echo ""
echo "⚠️  重要提醒:"
echo "- 确保在微信支付商户平台配置了回调URL:"
echo "  https://cloud1-2gyb3dkq4c474fe4.tcb.qcloud.la/cloudfunctions/payCallback"
echo "- 当前配置为生产环境，会产生真实费用"
echo ""
echo "✅ 准备完成，请按照上述步骤部署云函数"



