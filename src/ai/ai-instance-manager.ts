import { PokerEventType, globalEventBus } from '../core/event-bus.ts';
import { AIPersonality, AIPlayer, AIPlayerConfig } from './ai-player.ts';

// 🎮 AI实例管理器配置
export interface AIManagerConfig {
  maxAIPlayers: number;
  defaultTimeout: number;
  apiConfig: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  enablePerformanceMonitoring: boolean;
}

// 📊 AI性能指标
export interface AIPerformanceMetrics {
  playerId: string;
  playerName: string;
  averageDecisionTime: number;
  successRate: number;
  timeoutCount: number;
  totalDecisions: number;
  lastDecisionTime: number;
  isHealthy: boolean;
}

// 🚨 AI健康状态
export interface AIHealthStatus {
  playerId: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  lastHeartbeat: number;
  consecutiveFailures: number;
  issues: string[];
}

// 🤖 AI实例管理器
export class AIInstanceManager {
  private aiPlayers: Map<string, AIPlayer> = new Map();
  private performanceMetrics: Map<string, AIPerformanceMetrics> = new Map();
  private healthStatus: Map<string, AIHealthStatus> = new Map();
  private config: AIManagerConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(config: AIManagerConfig) {
    this.config = config;
    this.setupEventListeners();
    
    if (config.enablePerformanceMonitoring) {
      this.startPerformanceMonitoring();
    }
    
    console.log('🤖 AI实例管理器初始化完成');
    console.log('📊 配置:', config);
  }

  // 🎧 设置事件监听
  private setupEventListeners(): void {
    // 监听AI决策开始
    globalEventBus.subscribe(PokerEventType.AI_DECISION_START, (event) => {
      this.onAIDecisionStart(event);
    });

    // 监听AI决策完成
    globalEventBus.subscribe(PokerEventType.AI_DECISION_COMPLETE, (event) => {
      this.onAIDecisionComplete(event);
    });

    // 监听AI决策超时
    globalEventBus.subscribe(PokerEventType.AI_DECISION_TIMEOUT, (event) => {
      this.onAIDecisionTimeout(event);
    });

    // 监听错误事件
    globalEventBus.subscribe(PokerEventType.ERROR_OCCURRED, (event) => {
      if (event.playerId && this.aiPlayers.has(event.playerId)) {
        this.onAIError(event);
      }
    });
  }

  // 🚀 创建AI玩家
  createAIPlayer(name: string, personality?: Partial<AIPersonality>): AIPlayer {
    if (this.aiPlayers.size >= this.config.maxAIPlayers) {
      throw new Error(`AI玩家数量已达上限: ${this.config.maxAIPlayers}`);
    }

    const playerId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const defaultPersonality: AIPersonality = {
      aggression: 0.5,
      tightness: 0.5,
      bluffFrequency: 0.2,
      adaptability: 0.7,
      riskTolerance: 0.5
    };

    const aiConfig: AIPlayerConfig = {
      id: playerId,
      name,
      personality: { ...defaultPersonality, ...personality },
      apiConfig: {
        ...this.config.apiConfig,
        temperature: 0.1,
        maxTokens: 300 // 🔧 提升token限制防止JSON截断
      },
      decisionTimeoutMs: this.config.defaultTimeout
    };

    const aiPlayer = new AIPlayer(aiConfig);
    
    // 注册AI玩家
    this.aiPlayers.set(playerId, aiPlayer);
    
    // 初始化性能指标
    this.performanceMetrics.set(playerId, {
      playerId,
      playerName: name,
      averageDecisionTime: 0,
      successRate: 1.0,
      timeoutCount: 0,
      totalDecisions: 0,
      lastDecisionTime: 0,
      isHealthy: true
    });

    // 初始化健康状态
    this.healthStatus.set(playerId, {
      playerId,
      status: 'healthy',
      lastHeartbeat: Date.now(),
      consecutiveFailures: 0,
      issues: []
    });

    console.log(`🚀 创建AI玩家: ${name} (${playerId})`);
    console.log(`🎭 性格特征:`, aiConfig.personality);

    return aiPlayer;
  }

  // 🗑️ 移除AI玩家
  removeAIPlayer(playerId: string): boolean {
    const aiPlayer = this.aiPlayers.get(playerId);
    if (!aiPlayer) {
      console.warn(`⚠️ AI玩家不存在: ${playerId}`);
      return false;
    }

    this.aiPlayers.delete(playerId);
    this.performanceMetrics.delete(playerId);
    this.healthStatus.delete(playerId);

    console.log(`🗑️ 移除AI玩家: ${aiPlayer.getName()} (${playerId})`);
    return true;
  }

  // 🎯 获取AI玩家
  getAIPlayer(playerId: string): AIPlayer | undefined {
    return this.aiPlayers.get(playerId);
  }

  // 📋 获取所有AI玩家
  getAllAIPlayers(): AIPlayer[] {
    return Array.from(this.aiPlayers.values());
  }

  // 📊 获取性能指标
  getPerformanceMetrics(playerId?: string): AIPerformanceMetrics[] {
    if (playerId) {
      const metrics = this.performanceMetrics.get(playerId);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.performanceMetrics.values());
  }

  // 🏥 获取健康状态
  getHealthStatus(playerId?: string): AIHealthStatus[] {
    if (playerId) {
      const status = this.healthStatus.get(playerId);
      return status ? [status] : [];
    }
    return Array.from(this.healthStatus.values());
  }

  // 🔄 开始性能监控
  private startPerformanceMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
      this.updatePerformanceMetrics();
    }, 5000); // 每5秒检查一次

    console.log('📊 AI性能监控已启动');
  }

  // 🛑 停止性能监控
  stopPerformanceMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 AI性能监控已停止');
    }
  }

  // 🏥 执行健康检查
  private performHealthCheck(): void {
    const now = Date.now();
    
    this.healthStatus.forEach((status, playerId) => {
      const timeSinceLastHeartbeat = now - status.lastHeartbeat;
      const metrics = this.performanceMetrics.get(playerId);
      
      // 更新健康状态
      if (timeSinceLastHeartbeat > 60000) { // 1分钟无响应
        status.status = 'offline';
        status.issues.push('长时间无响应');
      } else if (status.consecutiveFailures >= 3) {
        status.status = 'critical';
        status.issues.push('连续决策失败');
      } else if (metrics && metrics.averageDecisionTime > this.config.defaultTimeout * 0.8) {
        status.status = 'warning';
        status.issues.push('决策时间过长');
      } else {
        status.status = 'healthy';
        status.issues = [];
      }

      // 发送健康状态事件
      if (status.status !== 'healthy') {
        globalEventBus.emit(PokerEventType.WARNING_ISSUED, {
          playerId,
          healthStatus: status,
          message: `AI玩家健康状态: ${status.status}`
        }, playerId);
      }
    });
  }

  // 📈 更新性能指标
  private updatePerformanceMetrics(): void {
    this.performanceMetrics.forEach((metrics) => {
      // 更新健康状态
      metrics.isHealthy = metrics.successRate > 0.8 && 
                         metrics.averageDecisionTime < this.config.defaultTimeout * 0.8;
    });
  }

  // 🎯 处理AI决策开始事件
  private onAIDecisionStart(event: any): void {
    const playerId = event.playerId;
    const status = this.healthStatus.get(playerId);
    
    if (status) {
      status.lastHeartbeat = Date.now();
    }
  }

  // ✅ 处理AI决策完成事件
  private onAIDecisionComplete(event: any): void {
    const playerId = event.playerId;
    const decision = event.data.decision;
    
    this.updateMetricsOnSuccess(playerId, decision.decisionTime);
  }

  // ⏰ 处理AI决策超时事件
  private onAIDecisionTimeout(event: any): void {
    const playerId = event.playerId;
    
    this.updateMetricsOnTimeout(playerId);
  }

  // ❌ 处理AI错误事件
  private onAIError(event: any): void {
    const playerId = event.playerId!;
    
    this.updateMetricsOnError(playerId, event.data.error);
  }

  // 📊 更新成功指标
  private updateMetricsOnSuccess(playerId: string, decisionTime: number): void {
    const metrics = this.performanceMetrics.get(playerId);
    const status = this.healthStatus.get(playerId);
    
    if (metrics) {
      metrics.totalDecisions++;
      metrics.lastDecisionTime = decisionTime;
      
      // 更新平均决策时间
      metrics.averageDecisionTime = 
        (metrics.averageDecisionTime * (metrics.totalDecisions - 1) + decisionTime) / metrics.totalDecisions;
      
      // 更新成功率
      const successfulDecisions = metrics.totalDecisions - metrics.timeoutCount;
      metrics.successRate = successfulDecisions / metrics.totalDecisions;
    }

    if (status) {
      status.consecutiveFailures = 0;
      status.lastHeartbeat = Date.now();
    }
  }

  // ⏰ 更新超时指标
  private updateMetricsOnTimeout(playerId: string): void {
    const metrics = this.performanceMetrics.get(playerId);
    const status = this.healthStatus.get(playerId);
    
    if (metrics) {
      metrics.totalDecisions++;
      metrics.timeoutCount++;
      metrics.lastDecisionTime = this.config.defaultTimeout;
      
      // 更新成功率
      const successfulDecisions = metrics.totalDecisions - metrics.timeoutCount;
      metrics.successRate = successfulDecisions / metrics.totalDecisions;
    }

    if (status) {
      status.consecutiveFailures++;
      status.lastHeartbeat = Date.now();
    }
  }

  // ❌ 更新错误指标
  private updateMetricsOnError(playerId: string, error: string): void {
    const status = this.healthStatus.get(playerId);
    
    if (status) {
      status.consecutiveFailures++;
      status.issues.push(error);
      status.lastHeartbeat = Date.now();
      
      // 限制问题列表长度
      if (status.issues.length > 5) {
        status.issues.shift();
      }
    }
  }

  // 📈 生成性能报告
  generatePerformanceReport(): string {
    const allMetrics = this.getPerformanceMetrics();
    const allStatus = this.getHealthStatus();
    
    const totalAI = allMetrics.length;
    const healthyAI = allStatus.filter(s => s.status === 'healthy').length;
    const averageDecisionTime = allMetrics.reduce((sum, m) => sum + m.averageDecisionTime, 0) / totalAI;
    const averageSuccessRate = allMetrics.reduce((sum, m) => sum + m.successRate, 0) / totalAI;

    return `
📈 AI实例管理器性能报告
========================
总AI数量: ${totalAI}
健康AI数量: ${healthyAI}
平均决策时间: ${averageDecisionTime.toFixed(2)}ms
平均成功率: ${(averageSuccessRate * 100).toFixed(1)}%

个体性能:
${allMetrics.map(m => 
  `${m.playerName}: ${m.averageDecisionTime.toFixed(0)}ms, ${(m.successRate * 100).toFixed(1)}% 成功率`
).join('\n')}

健康状态:
${allStatus.map(s => 
  `${s.playerId}: ${s.status}${s.issues.length > 0 ? ` (${s.issues.join(', ')})` : ''}`
).join('\n')}
`;
  }

  // 🧹 清理资源
  cleanup(): void {
    this.stopPerformanceMonitoring();
    this.aiPlayers.clear();
    this.performanceMetrics.clear();
    this.healthStatus.clear();
    
    console.log('🧹 AI实例管理器资源已清理');
  }
}
