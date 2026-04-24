#!/usr/bin/env python3
"""
Multi-Agent Task Tracker
跟踪多 agent 任务的执行状态和进度
"""

import json
import sys
from datetime import datetime
from typing import List, Dict, Optional


class TaskTracker:
    """跟踪多 agent 协作任务的进度"""
    
    def __init__(self, task_id: str, project_name: str = "NvwaX"):
        self.task_id = task_id
        self.project_name = project_name
        self.tasks: List[Dict] = []
        self.start_time = datetime.now()
        self.status = "in_progress"
    
    def add_task(self, 
                 agent: str, 
                 description: str, 
                 dependencies: List[str] = None,
                 estimated_hours: float = None) -> str:
        """添加子任务"""
        task_id = f"{self.task_id}-{len(self.tasks)}"
        task = {
            "id": task_id,
            "agent": agent,
            "description": description,
            "status": "pending",
            "dependencies": dependencies or [],
            "estimated_hours": estimated_hours,
            "started_at": None,
            "completed_at": None,
            "artifacts": [],
            "notes": ""
        }
        self.tasks.append(task)
        return task_id
    
    def start_task(self, task_id: str):
        """开始执行任务"""
        for task in self.tasks:
            if task["id"] == task_id:
                if task["status"] != "pending":
                    print(f"⚠️  Task {task_id} is already {task['status']}")
                    return False
                
                # 检查依赖
                unmet_deps = self._check_dependencies(task_id)
                if unmet_deps:
                    print(f"❌ Cannot start {task_id}: Unmet dependencies: {unmet_deps}")
                    return False
                
                task["status"] = "in_progress"
                task["started_at"] = datetime.now().isoformat()
                print(f"✅ Started task: {task_id} ({task['description']})")
                return True
        
        print(f"❌ Task {task_id} not found")
        return False
    
    def complete_task(self, task_id: str, artifacts: List[Dict] = None, notes: str = ""):
        """完成任务"""
        for task in self.tasks:
            if task["id"] == task_id:
                if task["status"] != "in_progress":
                    print(f"⚠️  Task {task_id} is not in progress")
                    return False
                
                task["status"] = "completed"
                task["completed_at"] = datetime.now().isoformat()
                task["artifacts"] = artifacts or []
                task["notes"] = notes
                
                print(f"✅ Completed task: {task_id}")
                
                # 检查是否有等待此任务的其他任务
                ready_tasks = self._get_ready_tasks()
                if ready_tasks:
                    print(f"📋 Ready to start: {', '.join(ready_tasks)}")
                
                return True
        
        print(f"❌ Task {task_id} not found")
        return False
    
    def fail_task(self, task_id: str, reason: str):
        """标记任务失败"""
        for task in self.tasks:
            if task["id"] == task_id:
                task["status"] = "failed"
                task["notes"] = reason
                task["completed_at"] = datetime.now().isoformat()
                print(f"❌ Failed task: {task_id} - {reason}")
                return True
        return False
    
    def _check_dependencies(self, task_id: str) -> List[str]:
        """检查任务的依赖是否已满足"""
        for task in self.tasks:
            if task["id"] == task_id:
                completed_tasks = {t["id"] for t in self.tasks if t["status"] == "completed"}
                unmet = [dep for dep in task["dependencies"] if dep not in completed_tasks]
                return unmet
        return []
    
    def _get_ready_tasks(self) -> List[str]:
        """获取可以开始的任务（依赖已满足）"""
        ready = []
        completed_tasks = {t["id"] for t in self.tasks if t["status"] == "completed"}
        
        for task in self.tasks:
            if task["status"] == "pending":
                unmet = [dep for dep in task["dependencies"] if dep not in completed_tasks]
                if not unmet:
                    ready.append(task["id"])
        
        return ready
    
    def get_progress(self) -> Dict:
        """获取整体进度"""
        total = len(self.tasks)
        if total == 0:
            return {
                "task_id": self.task_id,
                "total": 0,
                "completed": 0,
                "in_progress": 0,
                "pending": 0,
                "failed": 0,
                "progress_percent": 0,
                "elapsed_time": str(datetime.now() - self.start_time)
            }
        
        completed = sum(1 for t in self.tasks if t["status"] == "completed")
        in_progress = sum(1 for t in self.tasks if t["status"] == "in_progress")
        failed = sum(1 for t in self.tasks if t["status"] == "failed")
        pending = total - completed - in_progress - failed
        
        return {
            "task_id": self.task_id,
            "project": self.project_name,
            "total": total,
            "completed": completed,
            "in_progress": in_progress,
            "pending": pending,
            "failed": failed,
            "progress_percent": round((completed / total) * 100, 1),
            "elapsed_time": str(datetime.now() - self.start_time),
            "estimated_total_hours": sum(t.get("estimated_hours", 0) for t in self.tasks),
            "status": self.status
        }
    
    def display_status(self):
        """显示当前状态"""
        progress = self.get_progress()
        
        print("\n" + "="*60)
        print(f"Task: {progress['task_id']}")
        print(f"Project: {progress['project']}")
        print("="*60)
        
        # 进度条
        percent = progress['progress_percent']
        bar_length = 40
        filled = int(bar_length * percent / 100)
        bar = '█' * filled + '░' * (bar_length - filled)
        print(f"\nProgress: [{bar}] {percent}%")
        
        # 统计
        print(f"\nTasks:")
        print(f"  ✅ Completed:    {progress['completed']}")
        print(f"  🔄 In Progress:  {progress['in_progress']}")
        print(f"  ⏳ Pending:      {progress['pending']}")
        print(f"  ❌ Failed:       {progress['failed']}")
        print(f"  📊 Total:        {progress['total']}")
        
        print(f"\nTime:")
        print(f"  Elapsed:         {progress['elapsed_time']}")
        if progress.get('estimated_total_hours'):
            print(f"  Estimated Total: {progress['estimated_total_hours']}h")
        
        # 详细任务列表
        print(f"\n{'='*60}")
        print("Detailed Tasks:")
        print(f"{'='*60}\n")
        
        for task in self.tasks:
            status_icon = {
                "completed": "✅",
                "in_progress": "🔄",
                "pending": "⏳",
                "failed": "❌"
            }.get(task["status"], "❓")
            
            print(f"{status_icon} [{task['id']}] {task['description']}")
            print(f"   Agent: {task['agent']}")
            print(f"   Status: {task['status']}")
            
            if task.get('estimated_hours'):
                print(f"   Estimated: {task['estimated_hours']}h")
            
            if task.get('dependencies'):
                print(f"   Dependencies: {', '.join(task['dependencies'])}")
            
            if task.get('started_at'):
                print(f"   Started: {task['started_at']}")
            
            if task.get('completed_at'):
                print(f"   Completed: {task['completed_at']}")
            
            if task.get('artifacts'):
                print(f"   Artifacts: {len(task['artifacts'])} files")
            
            if task.get('notes'):
                print(f"   Notes: {task['notes']}")
            
            print()
        
        # 可以开始的任务
        ready = self._get_ready_tasks()
        if ready:
            print(f"{'='*60}")
            print(f"Ready to Start:")
            print(f"{'='*60}")
            for task_id in ready:
                task = next(t for t in self.tasks if t["id"] == task_id)
                print(f"  • {task_id}: {task['description']} ({task['agent']})")
            print()
    
    def export_report(self, format: str = "json") -> str:
        """导出报告"""
        report = {
            "task_id": self.task_id,
            "project": self.project_name,
            "summary": self.get_progress(),
            "tasks": self.tasks,
            "generated_at": datetime.now().isoformat()
        }
        
        if format == "json":
            return json.dumps(report, indent=2, ensure_ascii=False)
        elif format == "markdown":
            return self._to_markdown(report)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _to_markdown(self, report: Dict) -> str:
        """转换为 Markdown 格式"""
        summary = report["summary"]
        
        md = f"# Task Report: {report['task_id']}\n\n"
        md += f"**Project**: {report['project']}\n"
        md += f"**Generated**: {report['generated_at']}\n\n"
        
        md += "## Summary\n\n"
        md += f"- **Progress**: {summary['progress_percent']}%\n"
        md += f"- **Completed**: {summary['completed']}/{summary['total']} tasks\n"
        md += f"- **Elapsed Time**: {summary['elapsed_time']}\n\n"
        
        md += "## Tasks\n\n"
        md += "| ID | Description | Agent | Status |\n"
        md += "|----|-------------|-------|--------|\n"
        
        for task in report["tasks"]:
            md += f"| {task['id']} | {task['description']} | {task['agent']} | {task['status']} |\n"
        
        md += "\n"
        return md
    
    def save_to_file(self, filepath: str):
        """保存到文件"""
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(self.export_report(format="json"))
        print(f"💾 Report saved to: {filepath}")
    
    @classmethod
    def load_from_file(cls, filepath: str) -> 'TaskTracker':
        """从文件加载"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        tracker = cls(data["task_id"], data.get("project", "NvwaX"))
        tracker.tasks = data["tasks"]
        tracker.start_time = datetime.fromisoformat(data.get("started_at", datetime.now().isoformat()))
        return tracker


def create_blog_system_example():
    """创建博客系统示例"""
    tracker = TaskTracker("blog-system", "NvwaX Blog")
    
    # 数据库层
    db_task = tracker.add_task(
        "database-agent",
        "设计博客数据库 schema",
        estimated_hours=4
    )
    
    # 后端层
    api_posts = tracker.add_task(
        "backend-agent",
        "实现文章 CRUD API",
        dependencies=[db_task],
        estimated_hours=6
    )
    
    api_comments = tracker.add_task(
        "backend-agent",
        "实现评论 API",
        dependencies=[db_task],
        estimated_hours=4
    )
    
    api_auth = tracker.add_task(
        "backend-agent",
        "实现认证中间件",
        dependencies=[db_task],
        estimated_hours=3
    )
    
    # 前端层
    ui_home = tracker.add_task(
        "frontend-agent",
        "开发首页文章列表",
        dependencies=[api_posts],
        estimated_hours=5
    )
    
    ui_detail = tracker.add_task(
        "frontend-agent",
        "开发文章详情页",
        dependencies=[api_posts, api_comments],
        estimated_hours=4
    )
    
    ui_editor = tracker.add_task(
        "frontend-agent",
        "开发 Markdown 编辑器",
        dependencies=[api_posts],
        estimated_hours=6
    )
    
    # 测试层
    test_api = tracker.add_task(
        "test-agent",
        "编写 API 测试",
        dependencies=[api_posts, api_comments, api_auth],
        estimated_hours=4
    )
    
    test_e2e = tracker.add_task(
        "test-agent",
        "编写 E2E 测试",
        dependencies=[ui_home, ui_detail],
        estimated_hours=3
    )
    
    # 文档层
    docs_api = tracker.add_task(
        "docs-agent",
        "编写 API 文档",
        dependencies=[api_posts, api_comments],
        estimated_hours=2
    )
    
    # 审查
    review = tracker.add_task(
        "review-agent",
        "代码审查和安全审计",
        dependencies=[test_api, test_e2e],
        estimated_hours=2
    )
    
    return tracker


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("Usage: python task_tracker.py <command> [options]")
        print("\nCommands:")
        print("  demo              Show demo with blog system example")
        print("  create <task_id>  Create new task tracker")
        print("  load <file>       Load from file")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "demo":
        print("🚀 Creating blog system task tracker demo...\n")
        tracker = create_blog_system_example()
        
        # 模拟执行一些任务
        tracker.start_task("blog-system-0")  # 数据库设计
        tracker.complete_task("blog-system-0", 
                            artifacts=[{"path": "prisma/schema.prisma"}])
        
        tracker.start_task("blog-system-1")  # 文章 API
        tracker.start_task("blog-system-2")  # 评论 API
        
        tracker.display_status()
        
        # 导出报告
        tracker.save_to_file("task-report.json")
        print("\n" + tracker.export_report(format="markdown"))
    
    elif command == "create":
        if len(sys.argv) < 3:
            print("Error: Please provide task ID")
            sys.exit(1)
        
        task_id = sys.argv[2]
        tracker = TaskTracker(task_id)
        print(f"Created new task tracker: {task_id}")
        print("Use the tracker API to add and manage tasks.")
    
    elif command == "load":
        if len(sys.argv) < 3:
            print("Error: Please provide file path")
            sys.exit(1)
        
        filepath = sys.argv[2]
        try:
            tracker = TaskTracker.load_from_file(filepath)
            tracker.display_status()
        except Exception as e:
            print(f"Error loading file: {e}")
            sys.exit(1)
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
