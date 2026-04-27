/**
 * Project Management Agent - Jira/Trello 集成
 * 
 * 功能:
 * - Jira API 集成 (创建/更新任务、看板管理)
 * - Trello API 集成 (卡片管理、列表操作)
 * - 自动任务分解和分配
 * - 进度同步和报告生成
 */

const axios = require('axios');

class ProjectManagementAgent {
  constructor(config = {}) {
    this.platform = config.platform || 'jira'; // jira, trello
    this.apiConfig = config;
    
    // Jira 配置
    if (this.platform === 'jira') {
      this.jiraClient = axios.create({
        baseURL: config.jiraBaseUrl,
        auth: {
          username: config.jiraEmail,
          password: config.jiraApiToken
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Trello 配置
    if (this.platform === 'trello') {
      this.trelloKey = config.trelloKey;
      this.trelloToken = config.trelloToken;
      this.trelloClient = axios.create({
        baseURL: 'https://api.trello.com/1',
        params: {
          key: this.trelloKey,
          token: this.trelloToken
        }
      });
    }
  }

  /**
   * 创建 Jira 项目
   * @param {Object} projectInfo - 项目信息
   * @returns {Promise<Object>} 创建的项目
   */
  async createJiraProject(projectInfo) {
    console.log('📋 Creating Jira project...');
    
    const {
      name,
      key,
      description,
      leadAccountId,
      projectTypeKey = 'software',
      templateName = 'scrum'
    } = projectInfo;

    try {
      const response = await this.jiraClient.post('/rest/api/3/project', {
        name,
        key,
        description,
        leadAccountId,
        projectTypeKey,
        projectTemplateKey: `com.pyxis.greenhopper.jira:${templateName}`
      });

      console.log(`✅ Jira project created: ${response.data.id}`);
      return response.data;

    } catch (error) {
      console.error('Failed to create Jira project:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 创建 Jira Issue (任务/故事/Bug)
   * @param {Object} issueData - Issue 数据
   * @returns {Promise<Object>} 创建的 Issue
   */
  async createJiraIssue(issueData) {
    console.log('📝 Creating Jira issue...');
    
    const {
      projectKey,
      summary,
      description,
      issueType = 'Task',
      priority = 'Medium',
      assigneeId,
      labels = [],
      components = [],
      customFields = {}
    } = issueData;

    try {
      const fields = {
        project: { key: projectKey },
        summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: description
                }
              ]
            }
          ]
        },
        issuetype: { name: issueType },
        priority: { name: priority },
        labels,
        components: components.map(name => ({ name })),
        ...customFields
      };

      if (assigneeId) {
        fields.assignee = { id: assigneeId };
      }

      const response = await this.jiraClient.post('/rest/api/3/issue', {
        fields
      });

      console.log(`✅ Jira issue created: ${response.data.key}`);
      return response.data;

    } catch (error) {
      console.error('Failed to create Jira issue:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 批量创建任务 (从 PRD 自动分解)
   * @param {Object} prd - 产品需求文档
   * @param {string} projectKey - 项目 Key
   * @returns {Promise<Array>} 创建的任务列表
   */
  async createTasksFromPRD(prd, projectKey) {
    console.log('🔄 Decomposing PRD into tasks...');
    
    const tasks = [];
    
    // 为每个功能创建 Epic
    for (const feature of prd.features) {
      // 创建 Epic
      const epic = await this.createJiraIssue({
        projectKey,
        summary: `[Epic] ${feature.name}`,
        description: feature.description,
        issueType: 'Epic',
        labels: [`feature-${feature.id}`]
      });

      tasks.push(epic);

      // 为用户故事创建 Stories
      for (const story of feature.userStories) {
        const task = await this.createJiraIssue({
          projectKey,
          summary: story,
          description: `Part of Epic: ${feature.name}\n\nAcceptance Criteria:\n${feature.acceptanceCriteria.join('\n')}`,
          issueType: 'Story',
          priority: this.mapPriority(feature.priority),
          labels: [`feature-${feature.id}`, 'user-story']
        });

        tasks.push(task);
      }
    }

    console.log(`✅ Created ${tasks.length} tasks from PRD`);
    return tasks;
  }

  /**
   * 获取 Jira Sprint 信息
   * @param {string} boardId - 看板 ID
   * @returns {Promise<Object>} Sprint 信息
   */
  async getJiraSprints(boardId) {
    try {
      const response = await this.jiraClient.get(
        `/rest/agile/1.0/board/${boardId}/sprint`
      );
      
      return response.data.values;
    } catch (error) {
      console.error('Failed to get sprints:', error.message);
      throw error;
    }
  }

  /**
   * 更新 Jira Issue 状态
   * @param {string} issueId - Issue ID
   * @param {string} transition - 转换名称 (To Do → In Progress → Done)
   * @returns {Promise<void>}
   */
  async transitionJiraIssue(issueId, transition) {
    const transitions = {
      'To Do': 1,
      'In Progress': 2,
      'Done': 3
    };

    try {
      await this.jiraClient.post(`/rest/api/3/issue/${issueId}/transitions`, {
        transition: { id: transitions[transition] }
      });

      console.log(`✅ Issue ${issueId} transitioned to ${transition}`);
    } catch (error) {
      console.error('Failed to transition issue:', error.message);
      throw error;
    }
  }

  /**
   * 创建 Trello Board
   * @param {Object} boardInfo - Board 信息
   * @returns {Promise<Object>} 创建的 Board
   */
  async createTrelloBoard(boardInfo) {
    console.log('📋 Creating Trello board...');
    
    const { name, description, defaultLists = true } = boardInfo;

    try {
      const response = await this.trelloClient.post('/boards', {
        name,
        desc: description,
        defaultLists
      });

      console.log(`✅ Trello board created: ${response.data.id}`);
      return response.data;

    } catch (error) {
      console.error('Failed to create Trello board:', error.message);
      throw error;
    }
  }

  /**
   * 创建 Trello Card
   * @param {Object} cardData - Card 数据
   * @returns {Promise<Object>} 创建的 Card
   */
  async createTrelloCard(cardData) {
    console.log('📝 Creating Trello card...');
    
    const {
      listId,
      name,
      description,
      dueDate,
      labels = [],
      members = []
    } = cardData;

    try {
      const response = await this.trelloClient.post('/cards', {
        idList: listId,
        name,
        desc: description,
        due: dueDate,
        idLabels: labels,
        idMembers: members
      });

      console.log(`✅ Trello card created: ${response.data.id}`);
      return response.data;

    } catch (error) {
      console.error('Failed to create Trello card:', error.message);
      throw error;
    }
  }

  /**
   * 从 PRD 创建 Trello 卡片
   * @param {Object} prd - 产品需求文档
   * @param {string} boardId - Board ID
   * @returns {Promise<Array>} 创建的卡片列表
   */
  async createCardsFromPRD(prd, boardId) {
    console.log('🔄 Creating Trello cards from PRD...');
    
    // 获取 Board 的 Lists
    const listsResponse = await this.trelloClient.get(`/boards/${boardId}/lists`);
    const lists = listsResponse.data;
    
    const todoList = lists.find(l => l.name === 'To Do');
    if (!todoList) {
      throw new Error('To Do list not found');
    }

    const cards = [];

    // 为每个功能创建卡片
    for (const feature of prd.features) {
      const card = await this.createTrelloCard({
        listId: todoList.id,
        name: `${feature.name} (${feature.priority})`,
        description: `${feature.description}\n\nUser Stories:\n${feature.userStories.join('\n')}`,
        labels: this.mapPriorityToLabel(feature.priority),
        dueDate: this.calculateDueDate(feature.priority)
      });

      cards.push(card);
    }

    console.log(`✅ Created ${cards.length} cards from PRD`);
    return cards;
  }

  /**
   * 生成项目进度报告
   * @param {string} projectKey - 项目 Key (Jira) 或 boardId (Trello)
   * @returns {Promise<Object>} 进度报告
   */
  async generateProgressReport(projectKey) {
    console.log('📊 Generating progress report...');
    
    if (this.platform === 'jira') {
      return await this.generateJiraReport(projectKey);
    } else {
      return await this.generateTrelloReport(projectKey);
    }
  }

  /**
   * 生成 Jira 进度报告
   */
  async generateJiraReport(projectKey) {
    try {
      // 查询项目中的所有 Issue
      const response = await this.jiraClient.get('/rest/api/3/search', {
        params: {
          jql: `project = ${projectKey}`,
          fields: 'summary,status,assignee,priority,created,updated'
        }
      });

      const issues = response.data.issues;
      
      // 统计各状态的 Issue 数量
      const statusCount = {};
      issues.forEach(issue => {
        const status = issue.fields.status.name;
        statusCount[status] = (statusCount[status] || 0) + 1;
      });

      const total = issues.length;
      const done = statusCount['Done'] || 0;
      const inProgress = statusCount['In Progress'] || 0;
      const todo = statusCount['To Do'] || 0;

      const report = {
        platform: 'Jira',
        projectKey,
        totalIssues: total,
        statusBreakdown: statusCount,
        completionRate: total > 0 ? ((done / total) * 100).toFixed(1) : 0,
        issues,
        generatedAt: new Date().toISOString()
      };

      console.log(`✅ Jira report generated. Completion: ${report.completionRate}%`);
      return report;

    } catch (error) {
      console.error('Failed to generate Jira report:', error.message);
      throw error;
    }
  }

  /**
   * 生成 Trello 进度报告
   */
  async generateTrelloReport(boardId) {
    try {
      const response = await this.trelloClient.get(`/boards/${boardId}`, {
        params: {
          lists: 'open',
          cards: 'open',
          fields: 'name,desc,due,idMembers'
        }
      });

      const board = response.data;
      const lists = board.lists;
      
      const report = {
        platform: 'Trello',
        boardName: board.name,
        lists: lists.map(list => ({
          name: list.name,
          cardCount: list.cards.length,
          cards: list.cards.map(card => ({
            name: card.name,
            dueDate: card.due,
            members: card.idMembers
          }))
        })),
        generatedAt: new Date().toISOString()
      };

      console.log(`✅ Trello report generated`);
      return report;

    } catch (error) {
      console.error('Failed to generate Trello report:', error.message);
      throw error;
    }
  }

  /**
   * 辅助方法: 映射优先级
   */
  mapPriority(priority) {
    const priorityMap = {
      'must-have': 'High',
      'should-have': 'Medium',
      'could-have': 'Low',
      'won\'t-have': 'Lowest'
    };
    return priorityMap[priority] || 'Medium';
  }

  /**
   * 辅助方法: 映射优先级到标签
   */
  mapPriorityToLabel(priority) {
    // Trello 需要实际的 label IDs,这里返回颜色代码
    const colorMap = {
      'must-have': 'red',
      'should-have': 'yellow',
      'could-have': 'green',
      'won\'t-have': 'gray'
    };
    return [colorMap[priority] || 'blue'];
  }

  /**
   * 辅助方法: 计算截止日期
   */
  calculateDueDate(priority) {
    const daysMap = {
      'must-have': 7,
      'should-have': 14,
      'could-have': 30,
      'won\'t-have': 60
    };
    
    const days = daysMap[priority] || 14;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    
    return dueDate.toISOString();
  }
}

module.exports = ProjectManagementAgent;
