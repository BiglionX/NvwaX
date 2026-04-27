/**
 * DevOps Engineer Agent - CI/CD 和基础设施自动化专家
 * 
 * 职责:
 * - CI/CD 流水线配置 (GitHub Actions, GitLab CI, Jenkins)
 * - Docker 容器化和编排
 * - Kubernetes 部署和管理
 * - 监控和日志系统
 * - 基础设施即代码 (Terraform)
 * - 安全审计和合规检查
 */

const { HumanMessage } = require('@langchain/core/messages');
const { ChatOpenAI } = require('@langchain/openai');

class DevOpsAgent {
  constructor() {
    this.llm = new ChatOpenAI({
      modelName: process.env.OPENAI_API_KEY ? 'gpt-4' : 'gpt-3.5-turbo',
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY || 'mock-key'
    });
    
    this.ciCdPlatforms = ['GitHub Actions', 'GitLab CI', 'Jenkins', 'CircleCI'];
    this.cloudProviders = ['AWS', 'Azure', 'GCP', 'Alibaba Cloud'];
  }

  /**
   * 生成 CI/CD 流水线配置
   * @param {Object} projectInfo - 项目信息
   * @param {string} platform - CI/CD 平台
   * @returns {Promise<Object>} CI/CD 配置
   */
  async generateCICDConfig(projectInfo, platform = 'GitHub Actions') {
    console.log('🔄 DevOps Agent generating CI/CD pipeline...');
    
    const prompt = `
作为 DevOps 专家,请为以下项目生成 ${platform} CI/CD 流水线配置。

项目信息:
${JSON.stringify(projectInfo, null, 2)}

请按照以下 JSON 格式返回 CI/CD 配置(只返回 JSON):

{
  "pipelineName": "流水线名称",
  "platform": "${platform}",
  "stages": [
    {
      "name": "阶段名称",
      "description": "阶段描述",
      "jobs": [
        {
          "name": "任务名称",
          "steps": [
            {
              "name": "步骤名称",
              "command": "执行的命令",
              "timeout": "超时时间(分钟)"
            }
          ],
          "artifacts": ["产物1", "产物2"],
          "cache": ["缓存路径1"]
        }
      ]
    }
  ],
  "triggers": {
    "branches": ["main", "develop"],
    "tags": ["v*"],
    "paths": ["src/**", "tests/**"],
    "schedule": "cron表达式(可选)"
  },
  "environmentVariables": [
    {
      "name": "变量名",
      "value": "变量值或secret引用",
      "secret": true|false
    }
  ],
  "notifications": {
    "onSuccess": ["通知渠道1"],
    "onFailure": ["通知渠道2"]
  },
  "estimatedDuration": "预计执行时长(分钟)",
  "configurationFile": "完整的配置文件内容(YAML格式字符串)"
}

要求:
1. 包含完整的构建、测试、部署流程
2. 支持多环境部署 (dev/staging/prod)
3. 包含代码质量检查 (linting, security scan)
4. 支持并行执行以提高速度
5. 包含回滚机制
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let config;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        config = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse CI/CD config:', parseError);
        throw new Error('Invalid CI/CD configuration format');
      }
      
      console.log(`✅ CI/CD pipeline generated with ${config.stages.length} stages`);
      return config;
      
    } catch (error) {
      console.error('CI/CD generation failed:', error);
      throw error;
    }
  }

  /**
   * 生成 Docker 配置
   * @param {Object} projectInfo - 项目信息
   * @param {boolean} multiStage - 是否使用多阶段构建
   * @returns {Promise<Object>} Docker 配置
   */
  async generateDockerConfig(projectInfo, multiStage = true) {
    console.log('🐳 DevOps Agent generating Docker configuration...');
    
    const prompt = `
作为容器化专家,请为以下项目生成 Docker 配置。

项目信息:
${JSON.stringify(projectInfo, null, 2)}

多阶段构建: ${multiStage ? '是' : '否'}

请按照以下 JSON 格式返回 Docker 配置(只返回 JSON):

{
  "dockerfile": "完整的 Dockerfile 内容",
  "dockerCompose": "完整的 docker-compose.yml 内容",
  ".dockerignore": [".git", "node_modules", "*.md"],
  "images": [
    {
      "name": "镜像名称",
      "tag": "标签",
      "size": "预计大小(MB)",
      "layers": 层数
    }
  ],
  "optimizations": [
    "优化建议1",
    "优化建议2"
  ],
  "securityChecks": [
    "安全检查1",
    "安全检查2"
  ],
  "bestPractices": [
    "最佳实践1",
    "最佳实践2"
  ]
}

要求:
1. 使用 Alpine 等轻量级基础镜像
2. 多阶段构建以减小镜像体积
3. 非 root 用户运行
4. 健康检查配置
5. 合理的层缓存策略
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let config;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        config = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse Docker config:', parseError);
        throw new Error('Invalid Docker configuration format');
      }
      
      console.log(`✅ Docker configuration generated. Images: ${config.images.length}`);
      return config;
      
    } catch (error) {
      console.error('Docker config generation failed:', error);
      throw error;
    }
  }

  /**
   * 生成 Kubernetes 配置
   * @param {Object} deploymentInfo - 部署信息
   * @returns {Promise<Object>} K8s 配置
   */
  async generateKubernetesConfig(deploymentInfo) {
    console.log('☸️ DevOps Agent generating Kubernetes configuration...');
    
    const prompt = `
作为 Kubernetes 专家,请生成完整的 K8s 部署配置。

部署信息:
${JSON.stringify(deploymentInfo, null, 2)}

请按照以下 JSON 格式返回 K8s 配置(只返回 JSON):

{
  "namespace": "命名空间",
  "deployments": [
    {
      "name": "部署名称",
      "replicas": 副本数,
      "containers": [
        {
          "name": "容器名称",
          "image": "镜像",
          "resources": {
            "requests": {
              "cpu": "CPU请求",
              "memory": "内存请求"
            },
            "limits": {
              "cpu": "CPU限制",
              "memory": "内存限制"
            }
          },
          "healthCheck": {
            "liveness": "存活探针配置",
            "readiness": "就绪探针配置"
          }
        }
      ],
      "strategy": {
        "type": "RollingUpdate|Recreate",
        "maxSurge": "最大激增",
        "maxUnavailable": "最大不可用"
      }
    }
  ],
  "services": [
    {
      "name": "服务名称",
      "type": "ClusterIP|NodePort|LoadBalancer",
      "ports": [
        {
          "port": 端口,
          "targetPort": 目标端口,
          "protocol": "TCP|UDP"
        }
      ]
    }
  ],
  "ingress": {
    "host": "域名",
    "tls": true,
    "annotations": {}
  },
  "configMaps": [
    {
      "name": "配置名称",
      "data": {}
    }
  ],
  "secrets": [
    {
      "name": "密钥名称",
      "type": "Opaque|TLS",
      "keys": ["key1", "key2"]
    }
  ],
  "horizontalPodAutoscaler": {
    "minReplicas": 最小副本数,
    "maxReplicas": 最大副本数,
    "targetCPUUtilization": 目标CPU使用率,
    "targetMemoryUtilization": 目标内存使用率
  },
  "manifests": {
    "deployment.yml": "Deployment YAML内容",
    "service.yml": "Service YAML内容",
    "ingress.yml": "Ingress YAML内容"
  }
}
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let config;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        config = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse K8s config:', parseError);
        throw new Error('Invalid Kubernetes configuration format');
      }
      
      console.log(`✅ Kubernetes configuration generated with ${config.deployments.length} deployments`);
      return config;
      
    } catch (error) {
      console.error('K8s config generation failed:', error);
      throw error;
    }
  }

  /**
   * 生成监控和日志配置
   * @param {Object} infrastructure - 基础设施信息
   * @returns {Promise<Object>} 监控配置
   */
  async generateMonitoringConfig(infrastructure) {
    console.log('📊 DevOps Agent generating monitoring configuration...');
    
    const prompt = `
作为监控专家,请为以下基础设施生成监控和日志配置。

基础设施:
${JSON.stringify(infrastructure, null, 2)}

请按照以下 JSON 格式返回监控配置(只返回 JSON):

{
  "monitoringStack": {
    "metrics": "Prometheus + Grafana",
    "logging": "ELK Stack|Loki",
    "tracing": "Jaeger|Zipkin",
    "alerting": "AlertManager"
  },
  "dashboards": [
    {
      "name": "Dashboard名称",
      "purpose": "用途",
      "panels": ["面板1", "面板2"],
      "refreshInterval": "刷新间隔"
    }
  ],
  "alerts": [
    {
      "name": "告警名称",
      "condition": "触发条件",
      "threshold": "阈值",
      "duration": "持续时间",
      "severity": "critical|warning|info",
      "notification": ["通知渠道1", "通知渠道2"],
      "runbook": "处理手册链接"
    }
  ],
  "metrics": [
    {
      "name": "指标名称",
      "type": "counter|gauge|histogram",
      "description": "指标描述",
      "labels": ["label1", "label2"]
    }
  ],
  "logAggregation": {
    "source": "日志来源",
    "processing": "处理规则",
    "storage": "存储配置",
    "retention": "保留策略"
  },
  "distributedTracing": {
    "enabled": true,
    "samplingRate": 0.1,
    "propagation": "trace context传播方式"
  },
  "grafanaDashboards": [
    "dashboard-json-1",
    "dashboard-json-2"
  ]
}
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let config;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        config = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse monitoring config:', parseError);
        throw new Error('Invalid monitoring configuration format');
      }
      
      console.log(`✅ Monitoring configuration generated with ${config.alerts.length} alerts`);
      return config;
      
    } catch (error) {
      console.error('Monitoring config generation failed:', error);
      throw error;
    }
  }

  /**
   * 生成 Terraform 基础设施代码
   * @param {Object} infrastructure - 基础设施需求
   * @param {string} cloudProvider - 云服务商
   * @returns {Promise<Object>} Terraform 配置
   */
  async generateTerraformConfig(infrastructure, cloudProvider = 'AWS') {
    console.log('🏗️ DevOps Agent generating Terraform configuration...');
    
    const prompt = `
作为基础设施即代码专家,请为以下需求生成 Terraform 配置。

基础设施需求:
${JSON.stringify(infrastructure, null, 2)}

云服务商: ${cloudProvider}

请按照以下 JSON 格式返回 Terraform 配置(只返回 JSON):

{
  "provider": "${cloudProvider}",
  "region": "区域",
  "modules": [
    {
      "name": "模块名称",
      "source": "模块来源",
      "version": "版本",
      "inputs": {},
      "outputs": []
    }
  ],
  "resources": [
    {
      "type": "资源类型",
      "name": "资源名称",
      "configuration": {}
    }
  ],
  "variables": [
    {
      "name": "变量名",
      "type": "string|number|bool|list|map",
      "default": "默认值",
      "description": "描述"
    }
  ],
  "outputs": [
    {
      "name": "输出名",
      "value": "输出值",
      "description": "描述"
    }
  ],
  "terraformFiles": {
    "main.tf": "主配置文件内容",
    "variables.tf": "变量定义文件内容",
    "outputs.tf": "输出定义文件内容",
    "providers.tf": "提供者配置文件内容"
  },
  "bestPractices": [
    "最佳实践1",
    "最佳实践2"
  ],
  "securityRecommendations": [
    "安全建议1",
    "安全建议2"
  ]
}
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let config;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        config = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse Terraform config:', parseError);
        throw new Error('Invalid Terraform configuration format');
      }
      
      console.log(`✅ Terraform configuration generated with ${config.resources.length} resources`);
      return config;
      
    } catch (error) {
      console.error('Terraform config generation failed:', error);
      throw error;
    }
  }

  /**
   * 安全审计和合规检查
   * @param {Object} infrastructure - 基础设施配置
   * @returns {Promise<Object>} 安全审计报告
   */
  async performSecurityAudit(infrastructure) {
    console.log('🔒 DevOps Agent performing security audit...');
    
    const prompt = `
作为安全专家,请对以下基础设施配置进行安全审计。

基础设施配置:
${JSON.stringify(infrastructure, null, 2)}

请按照以下 JSON 格式返回安全审计报告(只返回 JSON):

{
  "auditDate": "审计日期 ISO 格式",
  "overallScore": 85,
  "criticalIssues": [
    {
      "id": "SEC-001",
      "title": "问题标题",
      "severity": "critical|high|medium|low",
      "description": "问题描述",
      "location": "位置",
      "impact": "影响说明",
      "remediation": "修复方案",
      "compliance": ["合规标准1", "合规标准2"]
    }
  ],
  "warnings": [
    {
      "id": "WARN-001",
      "title": "警告标题",
      "severity": "medium|low",
      "description": "警告描述",
      "recommendation": "建议"
    }
  ],
  "passedChecks": [
    "通过的检查1",
    "通过的检查2"
  ],
  "complianceStatus": {
    "SOC2": "compliant|non-compliant",
    "GDPR": "compliant|non-compliant",
    "HIPAA": "compliant|non-compliant",
    "ISO27001": "compliant|non-compliant"
  },
  "recommendations": [
    "改进建议1",
    "改进建议2"
  ],
  "actionPlan": [
    {
      "priority": "immediate|short-term|long-term",
      "action": "行动",
      "estimatedEffort": "工作量"
    }
  ]
}
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      let audit;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        audit = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Failed to parse security audit:', parseError);
        throw new Error('Invalid security audit format');
      }
      
      console.log(`✅ Security audit completed. Score: ${audit.overallScore}/100`);
      return audit;
      
    } catch (error) {
      console.error('Security audit failed:', error);
      throw error;
    }
  }
}

module.exports = DevOpsAgent;
