import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.tsx';
import { Badge } from './ui/badge.tsx';
import { Progress } from './ui/progress.tsx';
import { Button } from './ui/button.tsx';
import { AlertTriangle, Activity, Zap, RotateCcw } from 'lucide-react';

interface SessionStatus {
  sessionId: string;
  totalTokens: number;
  tokenThreshold: number;
  maxTokens: number;
  isNearLimit: boolean;
  historyLength: number;
}

interface SystemStatus {
  version: string;
  architecture: string;
  session: SessionStatus;
  config: {
    model: string;
    aiPersonality: string;
    maxTokens: number;
    temperature: number;
  };
}

interface HybridSessionMonitorProps {
  className?: string;
}

export function HybridSessionMonitor({ className }: HybridSessionMonitorProps) {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // 模拟获取系统状态
  useEffect(() => {
    const mockStatus: SystemStatus = {
      version: 'V1.5修正版',
      architecture: 'Chat Completions + 混合会话',
      session: {
        sessionId: 'sess_' + Math.random().toString(36).substr(2, 9),
        totalTokens: 15432,
        tokenThreshold: 37500,
        maxTokens: 50000,
        isNearLimit: false,
        historyLength: 23
      },
      config: {
        model: 'claude-sonnet-4-20250514',
        aiPersonality: 'goliath',
        maxTokens: 2000,
        temperature: 0.7
      }
    };

    setSystemStatus(mockStatus);

    // 模拟动态更新
    const interval = setInterval(() => {
      setSystemStatus(prev => {
        if (!prev) return mockStatus;
        
        return {
          ...prev,
          session: {
            ...prev.session,
            totalTokens: prev.session.totalTokens + Math.floor(Math.random() * 200),
            historyLength: prev.session.historyLength + (Math.random() > 0.7 ? 1 : 0),
            isNearLimit: (prev.session.totalTokens + 200) >= prev.session.tokenThreshold * 0.9
          }
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  if (!systemStatus) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 animate-pulse" />
            <span className="text-sm text-muted-foreground">加载系统状态...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tokenUsagePercentage = (systemStatus.session.totalTokens / systemStatus.session.tokenThreshold) * 100;
  const isNearThreshold = tokenUsagePercentage >= 90;

  return (
    <Card className={className}>
      <CardHeader 
        className="pb-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Goliath {systemStatus.version}</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {isNearThreshold && (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            )}
            <Badge variant={isNearThreshold ? "destructive" : "secondary"} className="text-xs">
              {systemStatus.architecture}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Token使用进度 */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Token使用情况</span>
            <span className={`${isNearThreshold ? 'text-orange-600' : 'text-muted-foreground'}`}>
              {systemStatus.session.totalTokens.toLocaleString()} / {systemStatus.session.tokenThreshold.toLocaleString()}
            </span>
          </div>
          
          <Progress 
            value={tokenUsagePercentage} 
            className="h-2"
          />
          
          {isNearThreshold && (
            <div className="flex items-center space-x-1 text-xs text-orange-600">
              <AlertTriangle className="h-3 w-3" />
              <span>接近阈值，即将触发总结模式</span>
            </div>
          )}
        </div>

        {/* 会话信息 */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground">会话ID</span>
            <div className="font-mono bg-muted/50 px-2 py-1 rounded">
              {systemStatus.session.sessionId.substring(0, 12)}...
            </div>
          </div>
          
          <div className="space-y-1">
            <span className="text-muted-foreground">历史记录</span>
            <div className="font-mono bg-muted/50 px-2 py-1 rounded">
              {systemStatus.session.historyLength} 条
            </div>
          </div>
        </div>

        {/* 展开的详细信息 */}
        {isExpanded && (
          <div className="space-y-3 border-t pt-3">
            <div className="text-xs space-y-2">
              <div className="font-medium text-muted-foreground">系统配置</div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">模型:</span>
                  <div className="font-mono text-xs bg-muted/50 px-1 py-0.5 rounded mt-1">
                    {systemStatus.config.model}
                  </div>
                </div>
                
                <div>
                  <span className="text-muted-foreground">性格:</span>
                  <div className="font-mono text-xs bg-muted/50 px-1 py-0.5 rounded mt-1 capitalize">
                    {systemStatus.config.aiPersonality}
                  </div>
                </div>
                
                <div>
                  <span className="text-muted-foreground">温度:</span>
                  <div className="font-mono text-xs bg-muted/50 px-1 py-0.5 rounded mt-1">
                    {systemStatus.config.temperature}
                  </div>
                </div>
                
                <div>
                  <span className="text-muted-foreground">响应Token:</span>
                  <div className="font-mono text-xs bg-muted/50 px-1 py-0.5 rounded mt-1">
                    {systemStatus.config.maxTokens}
                  </div>
                </div>
              </div>
              
              {/* API端点信息 */}
              <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="font-medium text-blue-800 text-xs mb-1">API端点</div>
                <div className="font-mono text-xs text-blue-600 break-all">
                  /chat/completions
                </div>
                <div className="text-xs text-blue-500 mt-1">
                  ✓ 使用标准Chat Completions端点
                </div>
              </div>
            </div>

            {/* 手动重置按钮 */}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => {
                // 这里会调用重置函数
                console.log('手动重置混合会话');
                setSystemStatus(prev => prev ? {
                  ...prev,
                  session: {
                    ...prev.session,
                    sessionId: 'sess_' + Math.random().toString(36).substr(2, 9),
                    totalTokens: 0,
                    historyLength: 0,
                    isNearLimit: false
                  }
                } : null);
              }}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              手动重置会话
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}