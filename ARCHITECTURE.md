# 🎯 德州扑克 AI 对战演示 - 项目架构文档

## 📋 项目概述

这是一个基于 React + TypeScript 的德州扑克 AI 对战演示项目，集成了多种 AI 决策引擎、GTO（游戏理论最优）策略和实时对战功能。

## 🏗️ 整体架构

```
德州扑克 AI 对战演示
├── 前端 (React + TypeScript)
│   ├── 游戏界面层
│   ├── AI 决策引擎
│   ├── 游戏逻辑核心
│   └── 状态管理
├── 后端 (Node.js + Express)
│   ├── GTO 数据服务
│   ├── API 接口
│   └── 数据存储
└── AI 系统
    ├── 多层决策架构
    ├── 混合会话管理
    └── 性能监控
```

## 📁 目录结构详解

### 🎮 核心目录

#### `/src/core/` - 游戏核心引擎
- **`game-engine.ts`** - 主游戏引擎，管理游戏状态、轮次、玩家行动
- **`event-bus.ts`** - 事件总线系统，处理游戏事件的发布订阅

#### `/src/ai/` - AI 决策系统
- **`fast-decision-engine.ts`** - 快速决策引擎，三层决策架构
- **`ai-player.ts`** - AI 玩家实体，管理 AI 配置和行为
- **`ai-instance-manager.ts`** - AI 实例管理器，监控 AI 性能和健康状态
- **`adaptive-prompt-manager.ts`** - 自适应 Prompt 管理器，根据复杂度生成不同级别的 Prompt
- **`situation-complexity-analyzer.ts`** - 局势复杂度分析器
- **`ai-api-pool.ts`** - AI API 连接池，管理并发请求

#### `/src/components/` - React 组件
- **`PokerTable.tsx`** - 主游戏桌面组件
- **`Player.tsx`** - 玩家组件
- **`Card.tsx`** - 扑克牌组件
- **`GameControls.tsx`** - 游戏控制面板
- **`AIConfig.tsx`** - AI 配置界面
- **`AIStatusMonitor.tsx`** - AI 状态监控面板
- **`HybridSessionMonitor.tsx`** - 混合会话监控

#### `/src/utils/` - 工具类和辅助系统
- **`gto-ai-system.ts`** - GTO AI 系统，混合会话架构
- **`hybrid-session-manager.ts`** - 混合会话管理器
- **`realtime-ai-system.ts`** - 实时 AI 状态管理
- **`player-notes.ts`** - 玩家笔记和历史管理
- **`poker.ts`** - 扑克游戏工具函数
- **`ai-personalities.ts`** - AI 性格配置

#### `/src/services/` - 服务层
- **`gto-service.ts`** - GTO 策略服务，与后端 GTO 数据交互

#### `/src/types/` - 类型定义
- **`poker.ts`** - 扑克游戏相关类型定义
- **`gto-poker.ts`** - GTO 系统类型定义

### 🖥️ 后端目录

#### `/server/` - Node.js 后端
- **`server.js`** - Express 服务器主文件
- **`gto-data.js`** - GTO 翻前策略数据和决策逻辑

## 🧠 AI 决策架构

### 三层决策系统

```
🚀 第一层：快速过滤 (50ms)
├── 缓存查询
├── 明显决策识别
└── 简单情况处理

📊 第二层：策略分析 (1-3s)
├── GTO 基础策略
├── 对手建模
└── 局势评估

🔍 第三层：精细调整 (200ms)
├── 复杂情况分析
├── Meta-game 考虑
└── 最终决策优化
```

### 自适应 Prompt 系统

根据局势复杂度自动选择 Prompt 级别：

- **Minimal** - 明显决策，极简 Prompt
- **Standard** - 常规决策，标准 Prompt
- **Detailed** - 复杂决策，详细 Prompt
- **Comprehensive** - 极复杂决策，专家级 Prompt

## 🎯 核心功能模块

### 1. 游戏引擎 (`PokerGameEngine`)
- 游戏状态管理
- 轮次控制
- 玩家行动处理
- 事件发布

### 2. AI 决策引擎 (`FastDecisionEngine`)
- 多层决策架构
- 性能优化
- 缓存机制
- 超时处理

### 3. GTO 系统 (`GTOAISystem`)
- 混合会话管理
- Token 效率优化
- 上下文保持
- 错误恢复

### 4. 实时监控系统
- AI 性能监控
- 健康状态检查
- 决策时间统计
- 错误率追踪

## 🔄 数据流

```
用户操作 → 游戏引擎 → 事件总线 → AI 决策引擎
    ↓           ↓           ↓           ↓
游戏状态更新 ← 状态管理 ← 组件更新 ← AI 决策结果
```

## 🚀 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Radix UI** - 组件库

### 后端
- **Node.js** - 运行时
- **Express** - Web 框架
- **CORS** - 跨域支持

### AI 集成
- **Claude Sonnet 4** - 主要 AI 模型
- **自定义 API 池** - 并发管理
- **混合会话架构** - 上下文管理

## 📊 性能特性

### AI 决策优化
- **并发处理** - 3个并行 API 连接
- **智能缓存** - 相似局势缓存复用
- **超时管理** - 移除超时限制，确保决策质量
- **降级策略** - API 失败时的安全决策

### 内存管理
- **事件清理** - 自动清理过期事件
- **状态优化** - 最小化状态存储
- **缓存控制** - LRU 缓存策略

## 🔧 配置系统

### AI 配置
```typescript
interface AIPlayerConfig {
  id: string;
  name: string;
  personality: AIPersonality;
  apiConfig: AIAPIConfig;
  decisionTimeoutMs: number;
}
```

### 游戏配置
```typescript
interface GameConfig {
  smallBlind: number;
  bigBlind: number;
  maxPlayers: number;
  timeoutMs: number;
}
```

## 🎮 游戏流程

1. **初始化** - 创建游戏引擎和 AI 玩家
2. **发牌** - 分发底牌和公共牌
3. **下注轮** - 玩家依次行动
4. **AI 决策** - 多层决策系统处理
5. **结果计算** - 确定胜负和筹码分配
6. **下一轮** - 重置状态开始新轮

## 📈 监控和调试

### 性能监控
- AI 决策时间统计
- API 调用成功率
- 内存使用情况
- 错误率追踪

### 调试功能
- 详细日志输出
- 游戏状态可视化
- AI 思考过程展示
- 决策路径追踪

## 🔮 扩展性设计

### 模块化架构
- 松耦合设计
- 插件式 AI 引擎
- 可配置决策策略
- 多种 AI 模型支持

### 未来扩展方向
- 多桌同时对战
- 锦标赛模式
- 更多 AI 性格
- 高级统计分析

## 🛠️ 开发指南

### 启动项目

#### 前端启动
```bash
npm install --legacy-peer-deps
npm start
```

#### 后端启动
```bash
cd server
npm install
npm start
```

### 环境配置

#### 前端环境变量
```env
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_AI_API_KEY=your-api-key
REACT_APP_AI_BASE_URL=https://api.tu-zi.com/v1
```

#### 后端环境变量
```env
PORT=3001
NODE_ENV=development
```

### 代码规范

#### TypeScript 配置
- 严格类型检查
- 接口优先设计
- 泛型合理使用
- 避免 any 类型

#### 组件设计原则
- 单一职责原则
- Props 接口明确
- 状态最小化
- 副作用隔离

## 🔍 关键实现细节

### AI 决策流程

```typescript
// 1. 局势复杂度分析
const complexity = complexityAnalyzer.analyzeSituation(gameState, playerId, holeCards);

// 2. 选择决策层级
const layer = selectDecisionLayer(complexity.category);

// 3. 生成自适应 Prompt
const prompt = adaptivePromptManager.generatePrompt(
  gameState, playerId, holeCards,
  complexity.promptType, timeLimit, temperature
);

// 4. 执行 AI 决策
const decision = await aiApiPool.makeDecision(prompt);

// 5. 结果验证和缓存
validateAndCache(decision, situationKey);
```

### 混合会话管理

```typescript
// Token 管理策略
if (currentTokens > TOKEN_THRESHOLD) {
  // 压缩历史上下文
  const compressed = compressHistory(sessionHistory);
  // 保留关键信息
  const essential = extractEssentialContext(compressed);
  // 重新初始化会话
  await initializeNewSession(essential);
}
```

### 事件驱动架构

```typescript
// 游戏事件类型
enum GameEventType {
  GAME_START = 'game_start',
  PLAYER_ACTION = 'player_action',
  CARDS_DEALT = 'cards_dealt',
  ROUND_END = 'round_end',
  AI_DECISION = 'ai_decision'
}

// 事件监听示例
eventBus.on(GameEventType.PLAYER_ACTION, (event) => {
  // 更新游戏状态
  updateGameState(event.data);
  // 触发 AI 决策
  triggerAIDecision(event.playerId);
});
```

## 📚 API 文档

### 前端 API

#### 游戏引擎 API
```typescript
class PokerGameEngine {
  startNewGame(players: Player[]): void
  processPlayerAction(playerId: string, action: string, amount?: number): boolean
  getGameState(): NewGameState
  getEventBus(): EventBus
}
```

#### AI 管理器 API
```typescript
class AIInstanceManager {
  createAIPlayer(name: string, personality?: Partial<AIPersonality>): AIPlayer
  removeAIPlayer(playerId: string): boolean
  getPerformanceMetrics(playerId: string): AIPerformanceMetrics
  getHealthStatus(): Map<string, AIHealthStatus>
}
```

### 后端 API

#### GTO 决策接口
```http
GET /api/preflop-decision
Query Parameters:
- hand: string (e.g., "AKs", "QQ")
- position: string (e.g., "UTG", "BTN")
- facing_action: string (e.g., "none", "raise_3bb")
- players_behind: number
- stack_bb: number

Response:
{
  "action": "raise",
  "amount": 300,
  "confidence": 0.85,
  "reasoning": "Strong hand in good position"
}
```

#### 健康检查接口
```http
GET /api/health
Response:
{
  "status": "ok",
  "timestamp": 1640995200000,
  "version": "1.0.0"
}
```

## 🐛 故障排除

### 常见问题

#### AI 决策超时
```typescript
// 解决方案：移除超时限制
const poolConfig = {
  timeout: 0 // 完全移除超时限制
};
```

#### 行动历史为空
```typescript
// 问题：重复方法定义覆盖
// 解决方案：删除简化实现版本
private getActionHistory(gameState: NewGameState): any[] {
  // 正确的实现
  return gameState.actionHistory || [];
}
```

#### React 19 兼容性
```bash
# 解决方案：使用 legacy peer deps
npm install --legacy-peer-deps
```

### 调试技巧

#### 启用详细日志
```typescript
// 在 fast-decision-engine.ts 中
console.log('🔍 详细调试信息:', debugData);
```

#### 监控 AI 性能
```typescript
// 查看 AI 决策时间
this.performanceTracker.recordDecision(playerId, totalTime, confidence);
```

## 📖 学习资源

### 德州扑克基础
- [德州扑克规则](https://zh.wikipedia.org/wiki/德州撲克)
- [GTO 策略入门](https://upswingpoker.com/gto-poker-strategy/)
- [位置重要性](https://www.pokernews.com/strategy/poker-position-importance.htm)

### AI 和机器学习
- [强化学习在扑克中的应用](https://arxiv.org/abs/1701.01724)
- [Pluribus AI 论文](https://science.sciencemag.org/content/365/6456/885)
- [CFR 算法详解](https://poker.cs.ualberta.ca/publications/NIPS07-cfr.pdf)

### 技术实现
- [React 18 新特性](https://reactjs.org/blog/2022/03/29/react-v18.html)
- [TypeScript 最佳实践](https://typescript-eslint.io/docs/)
- [Tailwind CSS 指南](https://tailwindcss.com/docs)

---

*本文档提供了完整的项目架构概览，包括技术实现、API 文档和故障排除指南。*
