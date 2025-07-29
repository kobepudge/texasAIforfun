import React, { useEffect, useState } from 'react';

// 🎯 对话状态监控组件 - 显示Context Caching效果
export interface ConversationStats {
  totalConversations: number;
  activeConversations: number;
  readyConversations: number;
  expiredConversations: number;
  warmingConversations: number;
  totalSystemTokens: number;
  averageTokensPerConversation: number;
  averageMessagesPerConversation: number;
  oldestConversation: number;
  healthyConversations: number;
}

interface ConversationMonitorProps {
  isVisible: boolean;
  conversationManager?: any;
}

export function ConversationMonitor({ isVisible, conversationManager }: ConversationMonitorProps) {
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [summary, setSummary] = useState<string>('');

  useEffect(() => {
    if (!isVisible || !conversationManager) return;

    const updateStats = () => {
      try {
        const currentStats = conversationManager.getStatistics();
        const currentSummary = conversationManager.getConversationSummary();
        
        setStats(currentStats);
        setSummary(currentSummary);
      } catch (error) {
        console.error('❌ 获取对话统计失败:', error);
      }
    };

    // 立即更新一次
    updateStats();

    // 每2秒更新一次
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, [isVisible, conversationManager]);

  if (!isVisible || !stats) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg z-50 min-w-[300px] max-w-[400px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-blue-400">🧠 Context Caching Monitor</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${stats.healthyConversations > 0 ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-xs text-gray-300">
            {stats.healthyConversations > 0 ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {/* 对话状态概览 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-800 p-2 rounded">
            <div className="text-blue-200 text-xs">总对话数</div>
            <div className="text-lg font-bold">{stats.totalConversations}</div>
          </div>
          <div className="bg-green-800 p-2 rounded">
            <div className="text-green-200 text-xs">健康对话</div>
            <div className="text-lg font-bold">{stats.healthyConversations}</div>
          </div>
        </div>

        {/* 详细状态 */}
        <div className="grid grid-cols-3 gap-1 text-xs">
          <div className="bg-gray-700 p-1 rounded text-center">
            <div className="text-gray-300">就绪</div>
            <div className="font-bold text-green-400">{stats.readyConversations}</div>
          </div>
          <div className="bg-gray-700 p-1 rounded text-center">
            <div className="text-gray-300">预热中</div>
            <div className="font-bold text-yellow-400">{stats.warmingConversations}</div>
          </div>
          <div className="bg-gray-700 p-1 rounded text-center">
            <div className="text-gray-300">过期</div>
            <div className="font-bold text-red-400">{stats.expiredConversations}</div>
          </div>
        </div>

        {/* Context Caching效果 */}
        <div className="border-t border-gray-600 pt-2">
          <div className="text-xs text-gray-300 mb-1">Context Caching效果</div>
          <div className="bg-purple-800 p-2 rounded">
            <div className="flex justify-between">
              <span className="text-purple-200 text-xs">系统Tokens缓存</span>
              <span className="font-bold text-purple-100">{stats.totalSystemTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-200 text-xs">平均每对话</span>
              <span className="font-bold text-purple-100">{stats.averageTokensPerConversation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-200 text-xs">平均消息数</span>
              <span className="font-bold text-purple-100">{stats.averageMessagesPerConversation}</span>
            </div>
          </div>
        </div>

        {/* 性能指标 */}
        <div className="text-xs text-gray-300">
          <div className="flex justify-between">
            <span>最老对话:</span>
            <span className="text-white">{stats.oldestConversation}分钟前</span>
          </div>
          <div className="flex justify-between">
            <span>缓存命中率:</span>
            <span className="text-green-400 font-bold">
              {stats.totalConversations > 0 
                ? Math.round((stats.readyConversations / stats.totalConversations) * 100)
                : 0}%
            </span>
          </div>
        </div>

        {/* 状态摘要 */}
        {summary && (
          <div className="border-t border-gray-600 pt-2">
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-300 hover:text-white">
                详细状态摘要
              </summary>
              <pre className="mt-2 bg-gray-800 p-2 rounded text-xs whitespace-pre-wrap text-gray-300">
                {summary}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

// 🎯 简化版性能指示器（用于游戏界面）
interface PerformanceIndicatorProps {
  conversationManager?: any;
  className?: string;
}

export function PerformanceIndicator({ conversationManager, className = '' }: PerformanceIndicatorProps) {
  const [stats, setStats] = useState<ConversationStats | null>(null);

  useEffect(() => {
    if (!conversationManager) return;

    const updateStats = () => {
      try {
        const currentStats = conversationManager.getStatistics();
        setStats(currentStats);
      } catch (error) {
        console.error('❌ 获取性能指标失败:', error);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 3000);

    return () => clearInterval(interval);
  }, [conversationManager]);

  if (!stats) {
    return null;
  }

  const cacheHitRate = stats.totalConversations > 0 
    ? Math.round((stats.readyConversations / stats.totalConversations) * 100)
    : 0;

  return (
    <div className={`flex items-center space-x-2 text-xs ${className}`}>
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${stats.healthyConversations > 0 ? 'bg-green-400' : 'bg-red-400'}`}></div>
        <span className="text-gray-600">Context Cache</span>
      </div>
      
      <div className="bg-gray-100 px-2 py-1 rounded">
        <span className="text-gray-700">命中率: </span>
        <span className={`font-bold ${cacheHitRate >= 80 ? 'text-green-600' : cacheHitRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
          {cacheHitRate}%
        </span>
      </div>
      
      <div className="bg-gray-100 px-2 py-1 rounded">
        <span className="text-gray-700">对话: </span>
        <span className="font-bold text-blue-600">{stats.healthyConversations}/{stats.totalConversations}</span>
      </div>
    </div>
  );
}