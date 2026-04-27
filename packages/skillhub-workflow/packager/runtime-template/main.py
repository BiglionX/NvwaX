#!/usr/bin/env python3
"""
BossClaw Agent Team 本地运行时入口

此脚本加载团队配置并启动交互式对话界面
"""

import json
import os
import sys
from pathlib import Path

# 添加当前目录到 Python 路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))


def load_team_config():
    """加载团队配置文件"""
    config_path = current_dir / 'config' / 'team-config.json'
    
    if not config_path.exists():
        print(f"❌ 错误: 找不到配置文件 {config_path}")
        sys.exit(1)
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    return config


def display_welcome(config):
    """显示欢迎信息"""
    metadata = config['metadata']
    print("\n" + "="*60)
    print(f"🚀 BossClaw AI Team: {metadata['teamName']}")
    print(f"📦 项目: {metadata['projectName']}")
    print(f"📅 导出时间: {metadata['exportedAt']}")
    print("="*60)
    
    # 显示团队成员
    teammates = config.get('teammates', [])
    if teammates:
        print(f"\n👥 团队成员 ({len(teammates)}人):")
        for i, teammate in enumerate(teammates, 1):
            role = teammate.get('role', 'Unknown')
            specialty = teammate.get('specialty', 'N/A')
            print(f"   {i}. {role} - {specialty}")
    
    print("\n💬 请输入您的需求,输入 'exit' 或 'quit' 退出\n")


def execute_task(config, user_input):
    """
    执行团队任务
    
    注意: 这里需要根据实际的 skillhub-workflow 实现来调整
    目前使用模拟实现
    """
    print(f"\n⚙️  正在处理: {user_input}")
    print("   (此处将调用 Leader Agent 执行团队协作)")
    
    # TODO: 实际集成 skillhub-workflow 的 LeaderAgent
    # from skillhub_workflow.agents.leader_agent import LeaderAgent
    # leader = LeaderAgent()
    # result = leader.execute_team_task(config, user_input, workspace={})
    
    # 模拟响应
    result = {
        "status": "completed",
        "message": f"已处理需求: {user_input}",
        "note": "完整功能需要集成 skillhub-workflow 引擎"
    }
    
    return result


def main():
    """主函数"""
    try:
        # 加载配置
        config = load_team_config()
        
        # 显示欢迎信息
        display_welcome(config)
        
        # 交互式对话循环
        while True:
            try:
                user_input = input("> ").strip()
                
                if not user_input:
                    continue
                
                if user_input.lower() in ['exit', 'quit', '退出']:
                    print("\n👋 再见!\n")
                    break
                
                # 执行任务
                result = execute_task(config, user_input)
                
                # 显示结果
                print(f"\n✅ 执行完成:")
                print(f"   状态: {result.get('status', 'unknown')}")
                print(f"   消息: {result.get('message', 'N/A')}")
                
                if result.get('note'):
                    print(f"   说明: {result['note']}")
                
                print()  # 空行
                
            except KeyboardInterrupt:
                print("\n\n👋 检测到中断信号,再见!\n")
                break
            except EOFError:
                print("\n\n👋 输入结束,再见!\n")
                break
    
    except Exception as e:
        print(f"\n❌ 发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
