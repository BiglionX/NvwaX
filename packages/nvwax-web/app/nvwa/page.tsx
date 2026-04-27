'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, Sparkles, Loader, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentFormData {
  name: string;
  description: string;
  dataSources: string[];
  outputs: string[];
  implementation: string;
  skills: string[];
}

export default function NvwaPage() {
  const { isLoggedIn, userInfo } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => {
    // 初始化欢迎消息
    return [{
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是 Nvwa，智能体之母 🌟\n\n我可以通过对话帮您创建专属的智能体。让我们开始吧！\n\n**第一步：您需要什么样的智能体？**\n\n请描述它的用途，例如：\n- "需要一个能自动回复客户咨询的客服智能体"\n- "想要一个分析股票数据的助手"\n- "创建一个生成营销文案的工具"',
      timestamp: new Date(),
    }];
  });
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    dataSources: [],
    outputs: [],
    implementation: '',
    skills: [],
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 添加助手消息
  const addAssistantMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // 添加用户消息
  const addUserMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 处理用户输入
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    addUserMessage(userMessage);
    setInputValue('');
    setIsTyping(true);

    // 模拟 AI 响应延迟
    setTimeout(() => {
      processUserInput(userMessage);
      setIsTyping(false);
    }, 1000);
  };

  // 处理用户输入的各个步骤
  const processUserInput = (input: string) => {
    switch (currentStep) {
      case 0: // 智能体用途
        setFormData(prev => ({ ...prev, description: input }));
        setCurrentStep(1);
        addAssistantMessage(
          `明白了！您想要创建一个"${input}"的智能体。\n\n**第二步：这个智能体需要访问哪些数据源？**\n\n例如：\n- 商品数据库\n- 订单系统\n- 知识库文档\n- API 接口\n- 用户评论数据`
        );
        break;

      case 1: // 数据源
        setFormData(prev => ({ ...prev, dataSources: [input] }));
        setCurrentStep(2);
        addAssistantMessage(
          `好的，它会访问"${input}"。\n\n**第三步：您希望它输出什么结果？**\n\n例如：\n- 回复客户消息\n- 生成订单报表\n- 分析数据趋势\n- 创建营销文案`
        );
        break;

      case 2: // 输出结果
        setFormData(prev => ({ ...prev, outputs: [input] }));
        setCurrentStep(3);
        addAssistantMessage(
          `清楚了，它会"${input}"。\n\n**第四步：您希望它如何得到这个结果？**\n\n例如：\n- 调用现有 API\n- 分析用户评论\n- 查询数据库\n- 使用机器学习模型`
        );
        break;

      case 3: // 实现方式
        setFormData(prev => ({ ...prev, implementation: input }));
        setCurrentStep(4);
        
        // 模拟搜索模板
        addAssistantMessage(
          `太好了！让我分析一下您的需求...\n\n🔍 **正在搜索匹配的智能体模板...**`
        );
        
        setTimeout(() => {
          addAssistantMessage(
            `✅ **找到了 3 个相似的模板！**\n\n1. **客服智能体模板** ⭐⭐⭐⭐⭐\n   - 包含技能：自然语言处理、知识库检索、对话管理\n   - 匹配度：85%\n\n2. **数据分析助手模板** ⭐⭐⭐⭐\n   - 包含技能：数据处理、可视化、报告生成\n   - 匹配度：70%\n\n3. **通用问答机器人模板** ⭐⭐⭐\n   - 包含技能：意图识别、上下文管理、多轮对话\n   - 匹配度：60%\n\n您想选择哪个模板？或者我可以为您创建一个全新的智能体。`
          );
          setCurrentStep(5);
        }, 2000);
        break;

      case 4: // 模板选择
        setCurrentStep(5);
        
        // 添加基础技能
        setFormData(prev => ({
          ...prev,
          skills: [
            '自然语言处理',
            '知识库检索',
            '对话管理',
          ]
        }));
        
        addAssistantMessage(
          `好的！我来分析这个模板需要的技能...\n\n📊 **技能分析结果：**\n\n✅ **已包含的技能：**\n- 自然语言处理\n- 知识库检索\n- 对话管理\n\n⚠️ **需要补充的技能：**\n- 订单查询 API 集成\n- 实时数据同步\n\n让我搜索技能商店...`
        );
        
        setTimeout(() => {
          // 添加更多技能
          setFormData(prev => ({
            ...prev,
            skills: [
              '自然语言处理',
              '知识库检索',
              '对话管理',
              '订单查询连接器',
              '实时数据同步器',
            ]
          }));
          
          addAssistantMessage(
            `🔍 **技能商店搜索结果：**\n\n✅ **找到匹配技能：**\n- 订单查询连接器（评分 4.8/5）\n- 实时数据同步器（评分 4.5/5）\n\n这些技能可以直接集成。现在让我为您生成智能体配置...\n\n✨ **智能体配置预览：**\n\n**名称：** ${formData.description || '客服智能体'}\n**数据源：** ${formData.dataSources.join(', ')}\n**输出：** ${formData.outputs.join(', ')}\n**实现方式：** ${formData.implementation}\n**技能：** NLP + 知识库 + 对话管理 + 订单查询 + 数据同步\n\n确认创建吗？`
          );
          setCurrentStep(6);
        }, 2000);
        break;

      case 6: // 确认创建
        if (input.toLowerCase().includes('确认') || input.toLowerCase().includes('是') || input.toLowerCase().includes('yes')) {
          if (!isLoggedIn) {
            addAssistantMessage(
              `在创建智能体之前，需要先登录账户。\n\n🔐 **请登录或注册**\n\n登录后，您的智能体会保存在个人空间中，可以随时管理和使用。\n\n[点击这里登录](/login)`
            );
          } else {
            // 询问是否保存到项目
            addAssistantMessage(
              `🎉 **智能体配置已准备就绪！**\n\n在创建之前，请选择保存方式：\n\n1️⃣ **保存到项目** - 将智能体关联到现有项目，便于团队协作\n2️⃣ **保存到个人空间** - 仅保存在您的个人账户中\n\n请输入 "1" 或 "2"，或者告诉我项目名称（例如：“保存到电商项目”）`
            );
            setCurrentStep(6.5); // 中间步骤
          }
        } else {
          addAssistantMessage(
            `没问题！您可以：\n1. 重新选择模板\n2. 修改需求\n3. 从头开始\n\n请告诉我您的想法~`
          );
        }
        break;

      case 6.5: // 选择保存方式
        // 检查是否输入了数字
        if (input === '1' || input.toLowerCase().includes('项目')) {
          // 获取用户的项目列表
          addAssistantMessage(
            `📂 **请选择要保存到的项目：**\n\n正在加载您的项目列表...\n\n（这里将显示项目选择器，暂时模拟）\n\n1. 电商网站项目\n2. 数据分析平台\n3. 内容管理系统\n4. [创建新项目]\n\n请输入项目编号（1-4），或者输入项目名称`
          );
          setCurrentStep(6.6);
        } else if (input === '2' || input.toLowerCase().includes('个人')) {
          // 直接保存到个人空间
          addAssistantMessage(
            `🎉 **智能体创建成功！**\n\n✨ **${formData.description || '客服智能体'}** 已经创建完成！\n\n📦 **保存位置：** 您的个人空间\n🔗 **访问链接：** /agents/${Date.now()}\n\n您可以：\n1. 立即测试智能体\n2. 查看智能体详情\n3. 分享智能体给他人\n4. 继续创建新的智能体\n\n还需要我帮您做什么吗？`
          );
          setCurrentStep(7);
        } else {
          addAssistantMessage(
            `请输入 "1" 保存到项目，或 "2" 保存到个人空间`
          );
        }
        break;

      case 6.6: // 选择具体项目
        // 模拟保存到项目
        const selectedProject = input === '4' ? '新项目' : 
                               input === '1' ? '电商网站项目' :
                               input === '2' ? '数据分析平台' :
                               input === '3' ? '内容管理系统' : input;
        
        addAssistantMessage(
          `🎉 **智能体创建成功并已保存到项目！**\n\n✨ **${formData.description || '客服智能体'}** 已经创建完成！\n\n📦 **保存位置：** ${selectedProject}\n👥 **团队配置：** 将自动生成对应的 AiTeam 和 Agent Teams\n🔗 **访问链接：** /projects/[projectId]/teams/[teamId]\n\n下一步：\n1. 查看项目中的团队配置\n2. 启动团队执行\n3. 监控执行过程\n4. 继续创建新的智能体\n\n还需要我帮您做什么吗？`
        );
        setCurrentStep(7);
        break;

      default:
        addAssistantMessage(
          `感谢您的反馈！如果您想创建新的智能体，可以说"创建新智能体"，或者问我任何问题。😊`
        );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-pink-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Nvwa
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">轻松创建专属智能体</p>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 - 左右分栏 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: 'calc(100vh - 180px)' }}>
          {/* 左侧面板 - 需求信息和技能 */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto">
            {/* 需求卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  需求信息
                </h3>
              </div>

              <div className="space-y-3">
                {formData.name && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">智能体名称</label>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{formData.name}</p>
                  </div>
                )}

                {formData.description && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">用途描述</label>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">{formData.description}</p>
                  </div>
                )}

                {formData.dataSources.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">数据源</label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {formData.dataSources.map((source, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-medium">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {formData.outputs.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">输出类型</label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {formData.outputs.map((output, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-medium">
                          {output}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {formData.implementation && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">实现方式</label>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{formData.implementation}</p>
                  </div>
                )}

                {!formData.name && !formData.description && formData.dataSources.length === 0 && (
                  <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                    <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">完成对话后，需求信息将在这里显示</p>
                  </div>
                )}
              </div>
            </div>

            {/* 技能卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Bot className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  已选技能
                </h3>
              </div>

              {formData.skills.length > 0 ? (
                <div className="space-y-2">
                  {formData.skills.map((skill, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="shrink-0 w-7 h-7 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{skill}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                  <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">分析需求后，将自动推荐技能</p>
                </div>
              )}
            </div>

            {/* 步骤进度 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">当前进度</h3>
              <div className="space-y-2.5">
                {[
                  '需求分析',
                  '数据源',
                  '输出类型',
                  '实现方式',
                  '模板匹配',
                  '技能分析',
                  '确认创建',
                ].map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      index < currentStep
                        ? 'bg-green-500 text-white'
                        : index === currentStep
                        ? 'bg-blue-500 text-white scale-110'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}>
                      {index < currentStep ? '✓' : index + 1}
                    </div>
                    <span className={`text-sm transition-colors ${
                      index === currentStep
                        ? 'text-blue-600 dark:text-blue-400 font-semibold'
                        : index < currentStep
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧面板 - 对话区域 */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            {/* Messages Area */}
            <div className="h-[calc(100vh-280px)] overflow-y-auto p-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Bot size={20} className="text-white" />
                  </div>
                )}
                
                <div
                  className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                    message.role === 'user'
                      ? 'bg-linear-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content.split('\n').map((line, idx) => {
                      // 简单 Markdown 渲染
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <strong key={idx} className="font-semibold">{line.slice(2, -2)}</strong>;
                      }
                      if (line.startsWith('- ')) {
                        return <div key={idx} className="ml-4">• {line.slice(2)}</div>;
                      }
                      if (line.match(/^\d+\./)) {
                        return <div key={idx} className="ml-4">{line}</div>;
                      }
                      return <div key={idx}>{line}</div>;
                    })}
                  </div>
                  <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center shrink-0">
                    <span className="text-white font-semibold">
                      {userInfo?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-4 justify-start">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot size={20} className="text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-5 py-3">
                  <Loader size={20} className="animate-spin text-blue-600" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

            {/* 输入区域 */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
              <div className="flex gap-3">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={currentStep === 0 ? "描述您想要的智能体..." : "输入您的回答..."}
                  className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm"
                  rows={2}
                  disabled={isTyping}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  className="px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2"
                >
                  <Send size={18} />
                  <span>发送</span>
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>按 Enter 发送，Shift + Enter 换行</span>
                {currentStep > 0 && currentStep < 7 && (
                  <button
                    onClick={() => {
                      if (confirm('确定要重新开始吗？当前进度将丢失。')) {
                        window.location.reload();
                      }
                    }}
                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <RotateCcw size={12} />
                    重新开始
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
