import { useState } from 'react';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Card } from './ui/card.tsx';
import { Label } from './ui/label.tsx';
import { Switch } from './ui/switch.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog.tsx';
import { Settings, Info, Bot, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AIConfig as AIConfigType, CustomModel } from '../types/poker.ts';
import { AI_PERSONALITIES } from '../utils/ai-personalities.ts';
import { AddModelDialog } from './AddModelDialog.tsx';

interface AIConfigProps {
  config: AIConfigType;
  onConfigUpdate: (config: AIConfigType) => void;
}

export function AIConfig({ config, onConfigUpdate }: AIConfigProps) {
  const [tempConfig, setTempConfig] = useState<AIConfigType>(config);
  const [isOpen, setIsOpen] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string>('');

  const handleSave = () => {
    onConfigUpdate(tempConfig);
    setIsOpen(false);
  };

  const handleReset = () => {
    setTempConfig(config);
  };

  // 当对话框打开时，重置临时配置为当前配置
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setTempConfig(config);
      // 重置连接状态
      setConnectionStatus('idle');
      setConnectionError('');
    }
  };

  // 添加自定义模型
  const handleAddModel = (model: CustomModel) => {
    setTempConfig(prev => ({
      ...prev,
      customModels: [...prev.customModels, model]
    }));
  };

  // 删除自定义模型
  const handleDeleteModel = (modelId: string) => {
    setTempConfig(prev => ({
      ...prev,
      customModels: prev.customModels.filter(m => m.id !== modelId),
      // 如果删除的是当前选中的模型，重置为默认模型
      model: prev.model === modelId ? 'kimi-k2-0711-preview' : prev.model
    }));
  };

  // 🔥 更新：获取所有可用模型，添加新的Gemini模型
  const getAllModels = () => {
    const defaultModels = [
      { id: 'kimi-k2-0711-preview', name: 'Kimi K2 (推荐)', group: 'Moonshot' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', group: 'Anthropic' },
      { id: 'claude-sonnet-4-20250514-thinking', name: 'Claude Sonnet 4 Thinking', group: 'Anthropic' },
      { id: 'gemini-2.5-flash-all', name: 'Gemini 2.5 Flash All', group: 'Google' },
      { id: 'gemini-2.5-flash-lite-preview-06-17', name: 'Gemini 2.5 Flash Lite Preview', group: 'Google' },
      { id: 'gemini-2.5-pro-exp-03-25', name: 'Gemini 2.5 Pro Exp', group: 'Google' },
      { id: 'gpt-4', name: 'GPT-4', group: 'OpenAI' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', group: 'OpenAI' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', group: 'OpenAI' },
      { id: 'claude-3-opus', name: 'Claude-3 Opus', group: 'Anthropic' },
      { id: 'claude-3-sonnet', name: 'Claude-3 Sonnet', group: 'Anthropic' }
    ];
    return [...defaultModels, ...tempConfig.customModels];
  };

  // 测试API连接
  const testConnection = async () => {
    if (!tempConfig.openaiApiKey.trim()) {
      setConnectionStatus('error');
      setConnectionError('请先输入API Key');
      return;
    }

    if (!tempConfig.baseUrl.trim()) {
      setConnectionStatus('error');
      setConnectionError('请先输入Base URL');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionError('');

    try {
      // Ensure API key contains only ASCII characters
      const cleanApiKey = tempConfig.openaiApiKey.replace(/[^\x00-\x7F]/g, "");
      
      // Warn if API key was modified
      if (cleanApiKey !== tempConfig.openaiApiKey) {
        console.warn('API Key包含非ASCII字符，已自动清理。请检查API Key是否正确。');
      }
      
      const response = await fetch(`${tempConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanApiKey}`
        },
        body: JSON.stringify({
          model: tempConfig.model,
          messages: [
            {
              role: 'user',
              content: 'Hello'
            }
          ],
          max_tokens: 5
        })
      });

      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ' - ' + errorText.substring(0, 200) : ''}`);
      }

      // 检查响应内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        throw new Error(`API返回非JSON响应。Content-Type: ${contentType}。这可能意味着：
1. API端点URL不正确
2. API服务暂时不可用
3. 网络配置问题

收到的响应开头: ${responseText.substring(0, 100)}...`);
      }

      const data = await response.json();
      
      // 验证响应结构
      if (!data.choices || !Array.isArray(data.choices)) {
        throw new Error('API响应格式不正确，缺少choices字段');
      }

      setConnectionStatus('success');
      setConnectionError('');
    } catch (error: any) {
      console.error('API连接测试失败:', error);
      setConnectionStatus('error');
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setConnectionError(`网络连接失败: 无法连接到 ${tempConfig.baseUrl}。请检查：
1. URL是否正确
2. 网络连接是否正常
3. 服务是否可用`);
      } else {
        setConnectionError(error.message || '连接测试失败');
      }
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`bg-white hover:bg-gray-100 text-black border border-gray-300 shadow-lg ${ 
            !config.enabled ? 'animate-pulse border-orange-400 shadow-orange-200' : ''
          }`}
        >
          <Settings className="w-4 h-4 mr-1" />
          AI设置
          {!config.enabled && (
            <span className="ml-1 w-2 h-2 bg-orange-400 rounded-full animate-ping"></span>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI配置设置
          </DialogTitle>
          <DialogDescription>
            配置AI API密钥和模型设置以启用智能德州扑克体验
          </DialogDescription>
        </DialogHeader>
        
        <Card className="p-6">
          <div className="space-y-6">
            {/* 启用AI */}
            <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
              tempConfig.enabled 
                ? 'bg-green-50 border-green-300 shadow-sm' 
                : 'bg-gray-50 border-gray-300 shadow-sm'
            }`}>
              <div className="space-y-1">
                <Label htmlFor="ai-enabled" className="font-medium text-base">启用AI决策</Label>
                <p className="text-xs text-gray-500">开启后AI将使用大模型进行智能决策</p>
              </div>
              <Switch
                id="ai-enabled"
                checked={tempConfig.enabled}
                onCheckedChange={(checked) => 
                  setTempConfig(prev => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            {/* 翻前GTO策略开关 */}
            <div className={`flex items-center justify-between p-3 rounded-lg border ${
              tempConfig.enabled 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-gray-50 border-gray-200 opacity-60'
            }`}>
              <div className="space-y-1">
                <Label htmlFor="preflop-gto" className={!tempConfig.enabled ? 'text-gray-400' : ''}>
                  启用翻前GTO策略
                </Label>
                <p className={`text-xs ${tempConfig.enabled ? 'text-gray-500' : 'text-gray-400'}`}>
                  开启: 翻前使用GTO查表决策(0ms快速响应)<br/>
                  关闭: 翻前也使用AI智能分析(更灵活但较慢)
                  {!tempConfig.enabled && <><br/><span className="text-orange-400">需要先启用AI决策</span></>}
                </p>
              </div>
              <Switch
                id="preflop-gto"
                checked={tempConfig.enablePreflopGTO ?? true} // 默认启用
                disabled={!tempConfig.enabled} // AI未启用时禁用此开关
                onCheckedChange={(checked) => 
                  setTempConfig(prev => ({ ...prev, enablePreflopGTO: checked }))
                }
              />
            </div>

            {/* 当前配置状态 */}
            {tempConfig.enabled && (
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <h4 className="font-medium mb-2">当前AI配置状态</h4>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Base URL:</span>
                    <span className="text-xs text-gray-600 max-w-48 truncate">
                      {tempConfig.baseUrl || '未设置'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>API Key:</span>
                    <span className="text-xs text-gray-600">
                      {tempConfig.openaiApiKey ? `${tempConfig.openaiApiKey.substring(0, 8)}...` : '未设置'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>模型:</span>
                    <span className="text-xs text-gray-600">{tempConfig.model}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>翻前策略:</span>
                    <span className="text-xs text-blue-600">
                      {tempConfig.enablePreflopGTO ?? true ? '🎯 GTO查表' : '🧠 AI分析'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>配置完整性:</span>
                    <span className={`text-xs ${tempConfig.openaiApiKey && tempConfig.baseUrl ? 'text-green-600' : 'text-red-600'}`}>
                      {tempConfig.openaiApiKey && tempConfig.baseUrl ? '✓ 完整' : '✗ 不完整'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* API配置 */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Info className="w-4 h-4" />
                API配置
              </h3>

              {/* Base URL */}
              <div className="space-y-2">
                <Label htmlFor="base-url">API Base URL</Label>
                <Input
                  id="base-url"
                  placeholder="https://api.moonshot.cn/v1"
                  value={tempConfig.baseUrl}
                  onChange={(e) => 
                    setTempConfig(prev => ({ ...prev, baseUrl: e.target.value }))
                  }
                />
                <p className="text-xs text-gray-500">
                  自定义API服务器地址，例如: https://api.moonshot.cn/v1
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk-u1oNdFZblFE09tVx2c42981a97De42C*****"
                  value={tempConfig.openaiApiKey}
                  onChange={(e) => 
                    setTempConfig(prev => ({ ...prev, openaiApiKey: e.target.value }))
                  }
                />
                <p className="text-xs text-gray-500">
                  你的API密钥将安全存储在本地，不会上传到任何服务器
                </p>
              </div>

              {/* 连接测试 */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>连接测试</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testConnection}
                    disabled={isTestingConnection || !tempConfig.openaiApiKey.trim() || !tempConfig.baseUrl.trim()}
                    className="flex items-center gap-2"
                  >
                    {isTestingConnection ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : connectionStatus === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : connectionStatus === 'error' ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : null}
                    {isTestingConnection ? '测试中...' : '测试连接'}
                  </Button>
                </div>
                
                {connectionStatus === 'success' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">连接成功!</span>
                    </div>
                    <p className="text-green-600 mt-1">API配置正确，可以正常使用AI功能。</p>
                  </div>
                )}
                
                {connectionStatus === 'error' && connectionError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                    <div className="flex items-center gap-2 text-red-700 mb-2">
                      <XCircle className="w-4 h-4" />
                      <span className="font-medium">连接失败</span>
                    </div>
                    <p className="text-red-600 whitespace-pre-line">{connectionError}</p>
                    
                    <div className="mt-3 p-2 bg-red-100 rounded text-xs">
                      <div className="font-medium mb-1">常见解决方案:</div>
                      <ul className="space-y-1">
                        <li>• 检查API Key是否正确</li>
                        <li>• 确认Base URL格式: https://api.tu-zi.com/v1</li>
                        <li>• 验证模型名称是否支持</li>
                        <li>• 检查网络连接</li>
                        <li>• 确认API服务是否可用</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* 模型选择 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="model">AI模型</Label>
                  <AddModelDialog 
                    onAddModel={handleAddModel}
                    existingModels={getAllModels()}
                  />
                </div>
                <select
                  id="model"
                  className="w-full p-2 border rounded-md text-sm"
                  value={tempConfig.model}
                  onChange={(e) => 
                    setTempConfig(prev => ({ ...prev, model: e.target.value }))
                  }
                >
                  {/* 推荐模型 */}
                  <optgroup label="🔥 推荐模型">
                    <option value="kimi-k2-0711-preview">Kimi K2 (推荐)</option>
                  </optgroup>
                  
                  {/* Moonshot模型 */}
                  <optgroup label="Moonshot">
                    <option value="kimi-k2-0711-preview">Kimi K2</option>
                  </optgroup>
                  
                  {/* Anthropic模型 */}
                  <optgroup label="Anthropic">
                    <option value="claude-sonnet-4-20250514-thinking">Claude Sonnet 4 Thinking</option>
                    <option value="claude-3-opus">Claude-3 Opus</option>
                    <option value="claude-3-sonnet">Claude-3 Sonnet</option>
                  </optgroup>

                  {/* Google模型 */}
                  <optgroup label="Google">
                    <option value="gemini-2.5-flash-all">Gemini 2.5 Flash All</option>
                    <option value="gemini-2.5-flash-lite-preview-06-17">Gemini 2.5 Flash Lite Preview</option>
                    <option value="gemini-2.5-pro-exp-03-25">Gemini 2.5 Pro Exp</option>
                  </optgroup>

                  {/* OpenAI模型 */}
                  <optgroup label="OpenAI">
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </optgroup>
                  
                  {/* 自定义模型 */}
                  {tempConfig.customModels.length > 0 && (
                    <optgroup label="自定义模型">
                      {tempConfig.customModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} {model.group && `(${model.group})`}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                
                {/* 推荐说明 */}
                <div className="bg-blue-50 p-3 rounded-lg text-xs">
                  <div className="font-medium text-blue-800 mb-1">💡 模型推荐</div>
                  <p className="text-blue-700">
                    <strong>Kimi K2</strong> 是当前最推荐的模型，在德州扑克策略分析和决策制定方面表现卓越，具有出色的逻辑推理能力和游戏理解力。
                  </p>
                </div>
              </div>
              
              {/* 自定义模型管理 */}
              {tempConfig.customModels.length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="text-sm font-medium">自定义模型管理</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {tempConfig.customModels.map((model) => (
                      <div key={model.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                        <div className="flex-1">
                          <div className="font-medium">{model.name}</div>
                          <div className="text-xs text-gray-500">
                            ID: {model.id} {model.group && `• ${model.group}`}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteModel(model.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI性格展示 */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium">AI性格类型</h3>
              <div className="grid grid-cols-1 gap-3">
                {Object.values(AI_PERSONALITIES).map((personality) => (
                  <div key={personality.key} className="p-3 border rounded-lg bg-gray-50">
                    <div className="text-sm font-medium">{personality.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{personality.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 使用说明 */}
            <div className="bg-blue-50 p-4 rounded-lg text-sm space-y-2">
              <h4 className="font-medium flex items-center gap-1">
                <Info className="w-4 h-4" />
                配置说明
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li>• <strong>API Base URL示例:</strong> https://api.moonshot.cn/v1</li>
                <li>• <strong>API Key格式:</strong> sk-u1oNdFZblFE09tVx2c42981a97De42C*****</li>
                <li>• <strong>推荐模型:</strong> Kimi K2 (最佳德州扑克策略分析)</li>
                <li>• 每个AI机器人有独特的性格特点进行决策</li>
                <li>• 启用AI后获得更智能的游戏体验</li>
                <li>• API调用失败时自动切换到本地逻辑</li>
              </ul>
              
              <div className="mt-3 p-3 bg-yellow-50 rounded text-xs">
                <strong>常见问题:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• 如果收到HTML响应，说明API端点URL不正确</li>
                  <li>• 确保URL以 /v1 结尾，不要包含 /chat/completions</li>
                  <li>• 验证API Key是否有权限访问选定的模型</li>
                  <li>• 使用"测试连接"按钮验证配置</li>
                </ul>
              </div>
              
              <div className="mt-2 p-3 bg-green-50 rounded text-xs">
                <strong>提示:</strong> 推荐使用Kimi K2模型获得最佳德州扑克AI体验。
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button onClick={handleSave} className="flex-1">
              保存设置
            </Button>
            <Button onClick={handleReset} variant="outline" className="flex-1">
              重置
            </Button>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}