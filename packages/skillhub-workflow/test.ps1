# SkillHub Workflow Engine - 测试脚本

## 1. 健康检查
curl http://localhost:3001/health

## 2. 创建工作流
curl -X POST http://localhost:3001/api/workflows `
  -H "Content-Type: application/json" `
  -d '{
    "name": "SkillHub Search Test",
    "description": "Test workflow for searching skills",
    "nodes": [
      {
        "id": "node_1",
        "type": "skillhub_search",
        "params": {
          "query": "AI",
          "limit": 5
        }
      },
      {
        "id": "node_2",
        "type": "text_process",
        "params": {
          "text": "test text",
          "operation": "uppercase"
        }
      }
    ],
    "edges": [
      { "from": "node_1", "to": "node_2" }
    ]
  }'

## 3. 获取工作流列表
curl http://localhost:3001/api/workflows

## 4. 执行工作流（替换 <workflow_id> 为实际 ID）
curl -X POST http://localhost:3001/api/workflows/<workflow_id>/execute `
  -H "Content-Type: application/json" `
  -d '{
    "input": {
      "query": "machine learning"
    }
  }'
