// 🚀 增强的事件总线系统

export interface PokerEvent {
  id: string;
  type: PokerEventType;
  playerId?: string;
  data: any;
  timestamp: number;
  priority: EventPriority;
}

export enum PokerEventType {
  // 游戏生命周期
  GAME_INITIALIZED = 'game_initialized',
  GAME_STARTED = 'game_started',
  GAME_ENDED = 'game_ended',
  ROUND_STARTED = 'round_started',
  ROUND_ENDED = 'round_ended',
  
  // 玩家事件
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_ACTION = 'player_action',
  PLAYER_TURN_START = 'player_turn_start',
  PLAYER_TURN_END = 'player_turn_end',
  PLAYER_ELIMINATED = 'player_eliminated',
  
  // 牌局事件
  CARDS_DEALT = 'cards_dealt',
  COMMUNITY_CARDS_REVEALED = 'community_cards_revealed',
  BLINDS_POSTED = 'blinds_posted',
  POT_UPDATED = 'pot_updated',
  PHASE_CHANGED = 'phase_changed',
  
  // AI事件
  AI_DECISION_START = 'ai_decision_start',
  AI_DECISION_COMPLETE = 'ai_decision_complete',
  AI_DECISION_TIMEOUT = 'ai_decision_timeout',
  AI_ANALYSIS_UPDATE = 'ai_analysis_update',
  
  // 性能事件
  PERFORMANCE_METRIC = 'performance_metric',
  ERROR_OCCURRED = 'error_occurred',
  WARNING_ISSUED = 'warning_issued'
}

export enum EventPriority {
  CRITICAL = 0,    // 游戏核心逻辑
  HIGH = 1,        // 玩家行动
  MEDIUM = 2,      // AI决策
  LOW = 3,         // 统计和监控
  DEBUG = 4        // 调试信息
}

export type EventHandler = (event: PokerEvent) => void | Promise<void>;

// 🎯 事件过滤器
export interface EventFilter {
  types?: PokerEventType[];
  playerId?: string;
  priority?: EventPriority;
  timeRange?: { start: number; end: number };
}

// 📊 事件统计
export interface EventStats {
  totalEvents: number;
  eventsByType: Map<PokerEventType, number>;
  eventsByPriority: Map<EventPriority, number>;
  averageProcessingTime: number;
  errorCount: number;
}

// 🚀 增强的事件总线
export class EnhancedEventBus {
  private handlers: Map<PokerEventType, EventHandler[]> = new Map();
  private eventHistory: PokerEvent[] = [];
  private eventQueue: PokerEvent[] = [];
  private isProcessing: boolean = false;
  private stats: EventStats;
  private maxHistorySize: number = 1000;

  constructor() {
    this.stats = {
      totalEvents: 0,
      eventsByType: new Map(),
      eventsByPriority: new Map(),
      averageProcessingTime: 0,
      errorCount: 0
    };

    // 启动事件处理循环
    this.startEventProcessing();
  }

  // 📝 订阅事件
  subscribe(eventType: PokerEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType)!.push(handler);
    
    console.log(`📝 订阅事件: ${eventType}`);
    
    // 返回取消订阅函数
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  // 🚀 发布事件
  emit(eventType: PokerEventType, data: any, playerId?: string, priority: EventPriority = EventPriority.MEDIUM): void {
    const event: PokerEvent = {
      id: this.generateEventId(),
      type: eventType,
      playerId,
      data,
      timestamp: Date.now(),
      priority
    };

    // 添加到队列
    this.eventQueue.push(event);
    
    // 按优先级排序
    this.eventQueue.sort((a, b) => a.priority - b.priority);
    
    console.log(`🚀 事件入队: ${eventType} (优先级: ${priority})`);
  }

  // ⚡ 立即发布事件（跳过队列）
  emitImmediate(eventType: PokerEventType, data: any, playerId?: string): void {
    const event: PokerEvent = {
      id: this.generateEventId(),
      type: eventType,
      playerId,
      data,
      timestamp: Date.now(),
      priority: EventPriority.CRITICAL
    };

    this.processEvent(event);
  }

  // 🔄 事件处理循环
  private startEventProcessing(): void {
    setInterval(() => {
      if (!this.isProcessing && this.eventQueue.length > 0) {
        this.processNextEvent();
      }
    }, 10); // 每10ms检查一次
  }

  // 📤 处理下一个事件
  private async processNextEvent(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    this.isProcessing = true;
    const event = this.eventQueue.shift()!;
    
    await this.processEvent(event);
    
    this.isProcessing = false;
  }

  // 🎯 处理单个事件
  private async processEvent(event: PokerEvent): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 添加到历史记录
      this.addToHistory(event);
      
      // 获取处理器
      const handlers = this.handlers.get(event.type) || [];
      
      // 并行执行所有处理器
      const promises = handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          console.error(`❌ 事件处理器错误 ${event.type}:`, error);
          this.stats.errorCount++;
        }
      });
      
      await Promise.all(promises);
      
      // 更新统计
      this.updateStats(event, Date.now() - startTime);
      
    } catch (error) {
      console.error(`❌ 事件处理失败 ${event.type}:`, error);
      this.stats.errorCount++;
    }
  }

  // 📚 添加到历史记录
  private addToHistory(event: PokerEvent): void {
    this.eventHistory.push(event);
    
    // 限制历史记录大小
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  // 📊 更新统计信息
  private updateStats(event: PokerEvent, processingTime: number): void {
    this.stats.totalEvents++;
    
    // 按类型统计
    const typeCount = this.stats.eventsByType.get(event.type) || 0;
    this.stats.eventsByType.set(event.type, typeCount + 1);
    
    // 按优先级统计
    const priorityCount = this.stats.eventsByPriority.get(event.priority) || 0;
    this.stats.eventsByPriority.set(event.priority, priorityCount + 1);
    
    // 更新平均处理时间
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (this.stats.totalEvents - 1) + processingTime) / this.stats.totalEvents;
  }

  // 🔍 查询事件历史
  getEventHistory(filter?: EventFilter): PokerEvent[] {
    let events = [...this.eventHistory];
    
    if (filter) {
      if (filter.types) {
        events = events.filter(e => filter.types!.includes(e.type));
      }
      
      if (filter.playerId) {
        events = events.filter(e => e.playerId === filter.playerId);
      }
      
      if (filter.priority !== undefined) {
        events = events.filter(e => e.priority === filter.priority);
      }
      
      if (filter.timeRange) {
        events = events.filter(e => 
          e.timestamp >= filter.timeRange!.start && 
          e.timestamp <= filter.timeRange!.end
        );
      }
    }
    
    return events;
  }

  // 📊 获取统计信息
  getStats(): EventStats {
    return { ...this.stats };
  }

  // 🧹 清理历史记录
  clearHistory(): void {
    this.eventHistory = [];
    console.log('🧹 事件历史已清理');
  }

  // 🔧 生成事件ID
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 📈 获取性能报告
  getPerformanceReport(): string {
    const stats = this.getStats();
    
    return `
📈 事件总线性能报告
==================
总事件数: ${stats.totalEvents}
平均处理时间: ${stats.averageProcessingTime.toFixed(2)}ms
错误数量: ${stats.errorCount}
队列长度: ${this.eventQueue.length}

事件类型分布:
${Array.from(stats.eventsByType.entries())
  .map(([type, count]) => `  ${type}: ${count}`)
  .join('\n')}

优先级分布:
${Array.from(stats.eventsByPriority.entries())
  .map(([priority, count]) => `  ${EventPriority[priority]}: ${count}`)
  .join('\n')}
`;
  }
}

// 🌟 全局事件总线实例
export const globalEventBus = new EnhancedEventBus();

// 🎯 便捷的事件发布函数
export const emitGameEvent = (type: PokerEventType, data: any, playerId?: string, priority?: EventPriority) => {
  globalEventBus.emit(type, data, playerId, priority);
};

export const emitCriticalEvent = (type: PokerEventType, data: any, playerId?: string) => {
  globalEventBus.emitImmediate(type, data, playerId);
};
