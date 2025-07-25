import { useState, useEffect } from 'react';
import { Card } from './ui/card.tsx';
import { Badge } from './ui/badge.tsx';
import { Wifi, WifiOff, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface AIStatusProps {
  enabled: boolean;
  model: string;
  lastResponseTime?: number;
  errorCount: number;
  successCount: number;
}

export function AIStatusMonitor({ enabled, model, lastResponseTime, errorCount, successCount }: AIStatusProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  // 自动显示/隐藏逻辑
  useEffect(() => {
    if (errorCount > 0 || !enabled) {
      setIsVisible(true);
      // 5秒后自动隐藏（除非有错误）
      if (enabled && errorCount === 0) {
        const timer = setTimeout(() => setIsVisible(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [enabled, errorCount]);

  if (!isVisible && enabled && errorCount === 0) {
    return null;
  }

  const getStatusColor = () => {
    if (!enabled) return 'bg-gray-500';
    if (errorCount > successCount) return 'bg-red-500';
    if (errorCount > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = () => {
    if (!enabled) return <WifiOff className="w-3 h-3" />;
    if (errorCount > successCount) return <XCircle className="w-3 h-3" />;
    if (errorCount > 0) return <AlertTriangle className="w-3 h-3" />;
    return <CheckCircle className="w-3 h-3" />;
  };

  const getStatusText = () => {
    if (!enabled) return 'AI已禁用';
    if (errorCount > successCount) return 'AI连接异常';
    if (errorCount > 0) return 'AI部分失败';
    return 'AI运行正常';
  };

  return (
    <Card className="absolute top-20 right-4 p-3 w-64 z-50 bg-white/95 backdrop-blur border shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
        <span className="text-sm font-medium">{getStatusText()}</span>
        <button 
          onClick={() => setIsVisible(false)}
          className="ml-auto text-gray-400 hover:text-gray-600 text-xs"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">模型:</span>
          <Badge variant="secondary" className="text-xs">
            {model || 'claude-sonnet-4-20250514'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">状态:</span>
          <div className="flex items-center gap-1">
            {getStatusIcon()}
            <span className={`${
              !enabled ? 'text-gray-600' : 
              errorCount > successCount ? 'text-red-600' : 
              errorCount > 0 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {enabled ? `${successCount}成功 ${errorCount}失败` : '本地决策'}
            </span>
          </div>
        </div>
        
        {lastResponseTime && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">响应时间:</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className={`${
                lastResponseTime > 5000 ? 'text-red-600' : 
                lastResponseTime > 2000 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {Math.round(lastResponseTime)}ms
              </span>
            </div>
          </div>
        )}
        
        {!enabled && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <div className="font-medium mb-1">💡 启用AI获得更好体验</div>
            <div>点击右上角"AI设置"配置API</div>
          </div>
        )}
        
        {enabled && errorCount > 0 && (
          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
            <div className="font-medium mb-1">⚠️ AI连接问题</div>
            <div>检查网络连接和API配置</div>
          </div>
        )}
      </div>
    </Card>
  );
}