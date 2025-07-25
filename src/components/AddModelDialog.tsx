import { useState } from 'react';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Label } from './ui/label.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog.tsx';
import { Plus, X, HelpCircle } from 'lucide-react';
import { CustomModel } from '../types/poker.ts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip.tsx';

interface AddModelDialogProps {
  onAddModel: (model: CustomModel) => void;
  existingModels: CustomModel[];
}

export function AddModelDialog({ onAddModel, existingModels }: AddModelDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    group: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.id.trim()) {
      newErrors.id = '模型ID是必填项';
    } else if (existingModels.some(m => m.id === formData.id.trim())) {
      newErrors.id = '该模型ID已存在';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = '模型名称是必填项';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      // 创建新模型
      const newModel: CustomModel = {
        id: formData.id.trim(),
        name: formData.name.trim(),
        group: formData.group.trim() || undefined
      };
      
      onAddModel(newModel);
      
      // 重置表单
      setFormData({ id: '', name: '', group: '' });
      setErrors({});
      setIsOpen(false);
    }
  };

  const handleClose = () => {
    setFormData({ id: '', name: '', group: '' });
    setErrors({});
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Plus className="w-4 h-4" />
          添加模型
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex flex-row items-start justify-between">
            <div className="flex-1">
              <DialogTitle>添加模型</DialogTitle>
              <DialogDescription>
                添加自定义AI模型以在poker游戏中使用
              </DialogDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose}
              className="h-8 w-8 p-0 -mt-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* 模型ID */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="model-id" className="text-sm">
                <span className="text-red-500">*</span> 模型ID
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>API调用时使用的模型标识符，如: gpt-3.5-turbo</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="model-id"
              placeholder="必填 例如 gpt-3.5-turbo"
              value={formData.id}
              onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
              className={errors.id ? "border-red-500" : ""}
            />
            {errors.id && (
              <p className="text-red-500 text-xs mt-1">{errors.id}</p>
            )}
          </div>

          {/* 模型名称 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="model-name" className="text-sm">
                模型名称
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>在界面中显示的模型名称</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="model-name"
              placeholder="例如 GPT-3.5"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* 分组名称 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="model-group" className="text-sm">
                分组名称
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>用于模型分类，可选填</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="model-group"
              placeholder="例如 ChatGPT"
              value={formData.group}
              onChange={(e) => setFormData(prev => ({ ...prev, group: e.target.value }))}
            />
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 text-white px-8"
            >
              添加模型
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}