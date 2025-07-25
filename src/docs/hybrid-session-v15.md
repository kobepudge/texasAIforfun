# Goliath GTO AI系统 V1.5 - 混合会话架构文档 (修正版)

## 🎯 概览

V1.5修正版实施了革命性的**混合会话(Hybrid Session)架构**，在保持使用标准`chat/completions`端点的基础上，实现了智能的有状态会话管理系统。该架构在保持强大GTO决策能力的同时，解决了长期对话中的Token溢出问题。

## 🔧 关键修正

**API端点**: 继续使用 `{baseUrl}/chat/completions`
**会话管理**: 在客户端实现混合会话逻辑  
**请求结构**: 保持标准Chat Completions格式
**状态维护**: 通过对话历史数组管理会话状态

## 🏗️ 架构特点

### 🔄 双模式运行
- **有状态模式(默认)**: 使用OpenAI Responses API的`previous_response_id`参数维持连续对话
- **总结模式(应急)**: 当Token接近上限时自动总结历史并重置会话

### 📊 智能Token管理
- **Token上限**: 50,000 tokens
- **阈值触发**: 37,500 tokens (75%)
- **自动监控**: 实时追踪Token使用情况
- **预警机制**: 90%阈值时发出警告

### 🧠 上下文保持
- **历史压缩**: 智能提炼关键决策信息
- **会话重置**: 无缝切换到新会话
- **状态恢复**: 保持AI对牌局的理解

## 🚀 技术实现

### 核心组件

#### 1. HybridSessionManager
```typescript
class HybridSessionManager {
  // Token管理
  private readonly TOKEN_THRESHOLD = 37500;
  private readonly MAX_CONTEXT_WINDOW = 50000;
  
  // 会话状态
  private currentSessionId: string = '';
  private totalTokens: number = 0;
  private handHistory: string[] = [];
}
```

#### 2. GTOAISystem V1.5
```typescript
class GTOAISystem {
  private hybridSession: HybridSessionManager;
  
  async makeDecision() {
    // 使用混合会话进行决策
    return await this.hybridSession.makeAIDecision();
  }
}
```

### API调用流程

#### 有状态模式 (修正版)
```typescript
// 首次请求 - 标准Chat Completions
const response = await fetch('/chat/completions', {
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' }
  })
});

// 后续请求 - 维护对话历史数组
const response = await fetch('/chat/completions', {
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    messages: [...conversationHistory, { role: 'user', content: newInfo }],
    response_format: { type: 'json_object' }
  })
});
```

#### 总结模式 (修正版)
```typescript
// 达到Token阈值时，重置对话历史
const compactHistory = this.summarizeHistory();
const resetMessages = [
  { role: 'system', content: systemPrompt },
  { role: 'assistant', content: `已加载牌局历史：${compactHistory}` },
  { role: 'user', content: newTurnInfo }
];

// 重置会话 - 使用新的消息数组
const response = await fetch('/chat/completions', {
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    messages: resetMessages,
    response_format: { type: 'json_object' }
  })
});

// 更新对话历史
this.conversationHistory = resetMessages;
```

## 🎮 用户界面

### 混合会话监控器
- **实时Token显示**: 当前使用量/阈值
- **进度条指示**: 直观显示Token使用进度
- **会话信息**: Session ID、历史记录数量
- **预警提示**: 接近阈值时的橙色警告
- **手动重置**: 一键重置会话状态

### 状态指示器
```typescript
interface SessionStatus {
  sessionId: string;        // 当前会话ID
  totalTokens: number;      // 累计Token数
  tokenThreshold: number;   // 阈值设置
  isNearLimit: boolean;     // 是否接近上限
  historyLength: number;    // 历史记录条数
}
```

## 🔧 配置选项

### 系统配置
```typescript
const config: AISystemConfig = {
  model: 'claude-sonnet-4-20250514',
  apiKey: 'your-api-key',
  baseUrl: 'https://api.tu-zi.com/v1',
  aiPersonality: 'goliath',
  responseFormat: 'json_object',
  maxTokens: 2000,           // 单次响应token限制
  temperature: 0.7
};
```

### 混合会话配置
```typescript
const hybridConfig: HybridSessionConfig = {
  tokenThreshold: 37500,     // 触发总结的阈值
  maxContextWindow: 50000,   // 最大上下文窗口
  summaryStrategy: 'keyActions', // 总结策略
  historyRetentionCount: 10  // 保留的历史记录数
};
```

## 📈 性能优势

### Token效率
- **节省Token**: 避免重复发送完整历史
- **成本控制**: 智能管理上下文长度
- **无限对话**: 理论上支持无限轮次的牌局

### 决策质量
- **上下文连贯**: 保持对牌局的长期记忆
- **GTO一致性**: 维持高质量的策略决策
- **对手分析**: 持续累积对手行为数据

### 系统稳定性
- **错误恢复**: API异常时的优雅降级
- **状态管理**: 健壮的会话状态追踪
- **自动清理**: 过期数据的自动清理

## 🛠️ 使用示例

### 基本使用 (修正版)
```typescript
// 创建GTO AI系统 - 使用标准chat/completions端点
const config = {
  model: 'claude-sonnet-4-20250514',
  apiKey: 'your-api-key',
  baseUrl: 'https://api.tu-zi.com/v1', // 标准端点
  aiPersonality: 'goliath',
  responseFormat: 'json_object',
  maxTokens: 2000,
  temperature: 0.7
};

const gtoAI = new GTOAISystem(config);

// 进行决策 - 自动管理会话状态
const decision = await gtoAI.makeDecision(
  handHistory,
  context,
  aiPlayerName,
  opponentId
);

// 检查系统状态
const status = gtoAI.getSystemStatus();
console.log('会话状态:', status.session);
console.log('对话长度:', status.session.conversationLength);
```

### 手动管理 (修正版)
```typescript
// 手动重置会话 - 清空对话历史
gtoAI.resetSession();

// 获取详细状态 - 包含对话历史信息
const sessionStatus = gtoAI.getSessionStatus();
if (sessionStatus.isNearLimit) {
  console.log('警告：即将触发总结模式');
  console.log('当前对话长度:', sessionStatus.conversationLength);
}
```

## 🔍 监控与调试

### 日志输出
```
🎯 Goliath-1 [混合会话] 开始决策分析
📊 当前Token计数: 15432/37500
➡️ [有状态模式] 继续现有会话...
📤 发送Responses API请求:
   模型: claude-sonnet-4-20250514
   previous_response_id: resp_abc123
✅ Responses API请求成功 (234ms)
📈 Token计数器累加至: 15680
```

### 错误处理
```
❌ Responses API请求失败: 401 Unauthorized
🔄 使用GTO备用决策: 阶段=flop, 位置=Button (BTN)
```

## 🚀 部署建议

### 生产环境
1. **API密钥管理**: 使用环境变量存储敏感信息
2. **错误监控**: 集成错误追踪系统
3. **性能监控**: 监控API响应时间和Token使用
4. **备份策略**: 定期保存重要的对手行为数据

### 开发环境
1. **调试模式**: 启用详细的日志输出
2. **测试数据**: 使用模拟数据进行测试
3. **热重载**: 支持配置的动态更新

## 🎉 升级说明

### 从V1.4升级
1. **自动兼容**: 现有代码无需修改
2. **新特性**: 自动启用混合会话功能
3. **性能提升**: 显著降低Token成本
4. **稳定性**: 提升长期游戏的稳定性

### 迁移步骤
```bash
# 1. 更新依赖
npm install

# 2. 启动应用
npm start

# 3. 验证功能
# 检查混合会话监控器是否正常显示
```

---

**Goliath GTO AI系统 V1.5** - 让AI扑克对战进入混合会话的新时代！ 🎯🚀