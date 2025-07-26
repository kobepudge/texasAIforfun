import { AIDecision } from './ai-player';

// 🔧 API配置
export interface APIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

// 📊 API连接状态
export interface APIConnection {
  id: string;
  config: APIConfig;
  isActive: boolean;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastUsed: number;
}

// 🚀 AI API连接池
export class AIAPIPool {
  private connections: APIConnection[] = [];
  private currentConnectionIndex: number = 0;
  private requestQueue: PendingRequest[] = [];
  private isProcessingQueue: boolean = false;

  constructor(apiConfig: APIConfig, poolSize: number = 3) {
    this.initializeConnections(apiConfig, poolSize);
    this.startQueueProcessor();
    
    console.log(`🚀 AI API连接池初始化完成 (${poolSize}个连接)`);
  }

  // 🏗️ 初始化连接池
  private initializeConnections(baseConfig: APIConfig, poolSize: number): void {
    for (let i = 0; i < poolSize; i++) {
      const connection: APIConnection = {
        id: `conn_${i}`,
        config: { ...baseConfig },
        isActive: true,
        requestCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        lastUsed: 0
      };
      
      this.connections.push(connection);
    }
  }

  // 🎯 发起决策请求
  async makeDecisionRequest(prompt: string, timeLimit: number): Promise<AIDecision> {
    return this.makeDecisionRequestWithConfig(prompt, timeLimit, this.connections[0]?.config.temperature || 0.1);
  }

  // 🎯 发起带配置的决策请求
  async makeDecisionRequestWithConfig(prompt: string, timeLimit: number, temperature: number): Promise<AIDecision> {
    const startTime = Date.now();

    try {
      // 选择最佳连接
      const connection = this.selectBestConnection();

      // 发起请求（使用动态温度）
      const response = await this.makeAPIRequestWithConfig(connection, prompt, timeLimit, temperature);

      // 解析响应
      const decision = this.parseAIResponse(response);

      // 更新连接统计
      this.updateConnectionStats(connection, Date.now() - startTime, true);

      return decision;

    } catch (error) {
      console.error('❌ AI API请求失败:', error);

      // 尝试备用连接
      return await this.tryBackupRequestWithConfig(prompt, timeLimit, temperature, startTime);
    }
  }

  // 🔄 并行请求（修复版本 - 等待第一个成功的请求）
  async makeParallelRequest(prompt: string, timeLimit: number): Promise<AIDecision> {
    const activeConnections = this.connections.filter(c => c.isActive);

    if (activeConnections.length === 0) {
      throw new Error('没有可用的API连接');
    }

    // 🚀 优化：对于德州扑克，直接使用单一请求更高效
    console.log('🎯 使用单一请求替代并行请求（更稳定）');
    return this.makeDecisionRequest(prompt, timeLimit);

    // 注释掉原来的并行逻辑，保留以备将来需要
    /*
    // 同时发起多个请求
    const promises = activeConnections.slice(0, 2).map(async (connection) => {
      try {
        const response = await this.makeAPIRequest(connection, prompt, timeLimit);
        return this.parseAIResponse(response);
      } catch (error) {
        throw error;
      }
    });

    // 使用Promise.allSettled等待所有请求完成，返回第一个成功的
    const results = await Promise.allSettled(promises);
    const successfulResult = results.find(result => result.status === 'fulfilled');

    if (successfulResult && successfulResult.status === 'fulfilled') {
      console.log('⚡ 并行请求成功');
      return successfulResult.value;
    } else {
      console.error('❌ 所有并行请求都失败了');
      throw new Error('所有并行请求都失败了');
    }
    */
  }

  // 🎯 选择最佳连接
  private selectBestConnection(): APIConnection {
    const activeConnections = this.connections.filter(c => c.isActive);
    
    if (activeConnections.length === 0) {
      throw new Error('没有可用的API连接');
    }

    // 基于性能选择连接
    const bestConnection = activeConnections.reduce((best, current) => {
      const bestScore = this.calculateConnectionScore(best);
      const currentScore = this.calculateConnectionScore(current);
      return currentScore > bestScore ? current : best;
    });

    return bestConnection;
  }

  // 📊 计算连接评分
  private calculateConnectionScore(connection: APIConnection): number {
    const successRate = connection.requestCount > 0 ? 
      (connection.requestCount - connection.errorCount) / connection.requestCount : 1;
    
    const responseTimeScore = connection.averageResponseTime > 0 ? 
      Math.max(0, 1 - connection.averageResponseTime / 10000) : 1; // 10秒为基准
    
    const recentUsageScore = Date.now() - connection.lastUsed > 5000 ? 1 : 0.5; // 5秒冷却
    
    return successRate * 0.5 + responseTimeScore * 0.3 + recentUsageScore * 0.2;
  }

  // 🌐 发起API请求
  private async makeAPIRequest(connection: APIConnection, prompt: string, timeLimit: number): Promise<string> {
    return this.makeAPIRequestWithConfig(connection, prompt, timeLimit, connection.config.temperature);
  }

  // 🌐 发起带配置的API请求
  private async makeAPIRequestWithConfig(connection: APIConnection, prompt: string, timeLimit: number, temperature: number): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeLimit);

    try {
      const response = await fetch(`${connection.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${connection.config.apiKey}`
        },
        body: JSON.stringify({
          model: connection.config.model,
          messages: [
            {
              role: 'system',
              content: '你是世界顶级的德州扑克AI，专注于快速、准确的决策。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: temperature, // 使用动态温度
          max_tokens: connection.config.maxTokens,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('API响应格式错误');
      }

      return data.choices[0].message.content;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`API请求超时 (${timeLimit}ms)`);
      }

      throw error;
    }
  }

  // 🔍 解析AI响应
  private parseAIResponse(responseText: string): AIDecision {
    try {
      // 尝试提取JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('响应中未找到JSON格式');
      }

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      // 验证必需字段
      if (!parsed.action || !['fold', 'check', 'call', 'bet', 'raise', 'all-in'].includes(parsed.action)) {
        throw new Error('无效的行动类型');
      }

      // 构建标准决策对象
      const decision: AIDecision = {
        action: parsed.action === 'bet' ? 'raise' : parsed.action, // 统一bet为raise
        amount: parsed.amount || 0,
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || '无推理信息',
        decisionTime: 0, // 会在外层设置
        metadata: {
          handStrength: parsed.hand_strength || parsed.handStrength || 0.5,
          positionFactor: parsed.position_factor || parsed.positionFactor || 'unknown',
          opponentAdjustment: parsed.opponent_adjustment || parsed.opponentAdjustment || 'standard',
          playType: parsed.play_type || parsed.playType || 'unknown'
        }
      };

      console.log('✅ AI响应解析成功:', decision.action);
      return decision;

    } catch (error) {
      console.error('❌ AI响应解析失败:', error);
      console.log('原始响应:', responseText);
      
      // 返回安全的默认决策
      return {
        action: 'fold',
        amount: 0,
        confidence: 0.3,
        reasoning: '响应解析失败，安全弃牌',
        decisionTime: 0,
        metadata: {
          handStrength: 0,
          positionFactor: 'unknown',
          opponentAdjustment: 'error',
          playType: 'emergency_fold'
        }
      };
    }
  }

  // 🔄 尝试备用请求
  private async tryBackupRequest(prompt: string, timeLimit: number, startTime: number): Promise<AIDecision> {
    return this.tryBackupRequestWithConfig(prompt, timeLimit, this.connections[0]?.config.temperature || 0.1, startTime);
  }

  // 🔄 尝试带配置的备用请求
  private async tryBackupRequestWithConfig(prompt: string, timeLimit: number, temperature: number, startTime: number): Promise<AIDecision> {
    const remainingTime = Math.max(1000, timeLimit - (Date.now() - startTime));

    // 尝试其他连接
    const backupConnections = this.connections.filter(c => c.isActive);

    for (const connection of backupConnections) {
      try {
        console.log(`🔄 尝试备用连接: ${connection.id} (温度: ${temperature})`);

        const response = await this.makeAPIRequestWithConfig(connection, prompt, remainingTime, temperature);
        const decision = this.parseAIResponse(response);

        this.updateConnectionStats(connection, Date.now() - startTime, true);
        return decision;

      } catch (error) {
        console.log(`❌ 备用连接失败: ${connection.id}`);
        this.updateConnectionStats(connection, Date.now() - startTime, false);
      }
    }

    // 所有连接都失败，返回紧急决策
    console.error('❌ 所有API连接都失败了');
    return this.getEmergencyDecision();
  }

  // 🚨 紧急决策
  private getEmergencyDecision(): AIDecision {
    return {
      action: 'fold',
      amount: 0,
      confidence: 0.1,
      reasoning: 'API连接失败，紧急弃牌',
      decisionTime: 0,
      metadata: {
        handStrength: 0,
        positionFactor: 'unknown',
        opponentAdjustment: 'emergency',
        playType: 'emergency_fold'
      }
    };
  }

  // 📊 更新连接统计
  private updateConnectionStats(connection: APIConnection, responseTime: number, success: boolean): void {
    connection.requestCount++;
    connection.lastUsed = Date.now();

    if (success) {
      // 更新平均响应时间
      connection.averageResponseTime = 
        (connection.averageResponseTime * (connection.requestCount - 1) + responseTime) / connection.requestCount;
    } else {
      connection.errorCount++;
      
      // 如果错误率过高，暂时禁用连接
      const errorRate = connection.errorCount / connection.requestCount;
      if (errorRate > 0.5 && connection.requestCount > 5) {
        connection.isActive = false;
        console.warn(`⚠️ 连接 ${connection.id} 错误率过高，暂时禁用`);
        
        // 5分钟后重新启用
        setTimeout(() => {
          connection.isActive = true;
          connection.errorCount = 0;
          console.log(`🔄 连接 ${connection.id} 重新启用`);
        }, 300000);
      }
    }
  }

  // 🔄 队列处理器
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.isProcessingQueue && this.requestQueue.length > 0) {
        this.processRequestQueue();
      }
    }, 100);
  }

  private async processRequestQueue(): Promise<void> {
    if (this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;
    
    const request = this.requestQueue.shift()!;
    
    try {
      const decision = await this.makeDecisionRequest(request.prompt, request.timeLimit);
      request.resolve(decision);
    } catch (error) {
      request.reject(error);
    }
    
    this.isProcessingQueue = false;
  }

  // 📊 获取连接池状态
  getPoolStatus(): PoolStatus {
    const activeConnections = this.connections.filter(c => c.isActive).length;
    const totalRequests = this.connections.reduce((sum, c) => sum + c.requestCount, 0);
    const totalErrors = this.connections.reduce((sum, c) => sum + c.errorCount, 0);
    const averageResponseTime = this.connections.reduce((sum, c) => sum + c.averageResponseTime, 0) / this.connections.length;

    return {
      totalConnections: this.connections.length,
      activeConnections,
      totalRequests,
      totalErrors,
      successRate: totalRequests > 0 ? (totalRequests - totalErrors) / totalRequests : 1,
      averageResponseTime,
      queueLength: this.requestQueue.length
    };
  }

  // 🧹 清理资源
  cleanup(): void {
    this.connections.forEach(connection => {
      connection.isActive = false;
    });
    
    this.requestQueue = [];
    console.log('🧹 AI API连接池已清理');
  }
}

// 🔧 辅助接口
interface PendingRequest {
  prompt: string;
  timeLimit: number;
  resolve: (decision: AIDecision) => void;
  reject: (error: Error) => void;
}

export interface PoolStatus {
  totalConnections: number;
  activeConnections: number;
  totalRequests: number;
  totalErrors: number;
  successRate: number;
  averageResponseTime: number;
  queueLength: number;
}
