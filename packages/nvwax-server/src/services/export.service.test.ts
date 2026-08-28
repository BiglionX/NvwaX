/**
 * Team Export Formatters - 多壳落地导出格式单元测试
 *
 * 覆盖：
 * - convertToCrewAIYaml：members → agents 映射、workflow → tasks 映射、空 members 兜底
 * - convertToLangGraphJson：members → nodes 映射、steps → edges 映射、fallback 线性连接
 * - normalizeTeamData：aiteams 表行 / session teamDesign.roles 两种来源归一化
 * - serializeTeamExport：5 种格式产物内容合法
 * - ExportService.generateFile：端到端文件落地
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { mkdtempSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import yaml from 'js-yaml';
import {
  normalizeTeamData,
  convertToCrewAIYaml,
  convertToLangGraphJson,
  convertToProClawFormat,
  serializeTeamExport,
  suggestTeamFilename,
  type TeamExportFormat
} from './team-export-formatters.js';
import { ExportService } from './export.service.js';

describe('Team Export Formatters - 多壳落地导出', () => {
  // ===========================================================
  // normalizeTeamData
  // ===========================================================
  describe('normalizeTeamData', () => {
    it('aiteams 表行形状（members[].role/responsibilities/config）归一化', () => {
      const raw = {
        name: '增长团队',
        description: '负责内容生产',
        version: '1.2.0',
        tags: ['marketing'],
        category: 'marketing',
        workflow: { steps: [] },
        members: [
          {
            agentId: 'a1',
            agentName: 'Strategist',
            role: '内容策略师',
            responsibilities: ['负责选题', '负责内容审核'],
            config: { systemPrompt: '你是一位资深内容策略师。' }
          }
        ]
      };
      const out = normalizeTeamData(raw);
      expect(out.name).toBe('增长团队');
      expect(out.members).toHaveLength(1);
      expect(out.members[0]).toMatchObject({
        role: '内容策略师',
        responsibilities: ['负责选题', '负责内容审核']
      });
    });

    it('session teamDesign.roles 形状归一化', () => {
      const raw = {
        name: '虚拟公司',
        teamDesign: {
          roles: [
            {
              roleName: 'CEO',
              description: '负责整体战略',
              responsibilities: ['战略决策']
            },
            {
              roleName: '内容策略师',
              description: '负责内容方向',
              responsibilities: ['选题', '审核']
            }
          ]
        }
      };
      const out = normalizeTeamData(raw);
      expect(out.members).toHaveLength(2);
      expect(out.members[0].role).toBe('CEO');
      expect(out.members[0].config.systemPrompt).toContain('整体战略');
      expect(out.members[1].role).toBe('内容策略师');
    });
  });

  // ===========================================================
  // CrewAI YAML
  // ===========================================================
  describe('convertToCrewAIYaml', () => {
    it('members 正确映射为 agents（role/goal/backstory）', () => {
      const data = normalizeTeamData({
        name: '增长团队',
        description: '负责内容生产',
        version: '1.2.0',
        tags: ['marketing'],
        category: 'marketing',
        workflow: {
          steps: [
            { name: '选题', description: '产出 5 个选题', agent: '内容策略师' }
          ]
        },
        members: [
          {
            role: '内容策略师',
            responsibilities: ['负责选题', '负责内容审核'],
            config: { systemPrompt: '你是一位资深内容策略师。' }
          }
        ]
      });

      const out = convertToCrewAIYaml(data);

      expect(out.crew.name).toBe('增长团队');
      expect(out.crew.process).toBe('sequential');
      expect(out.crew.agents).toHaveLength(1);
      expect(out.crew.agents[0]).toMatchObject({
        role: '内容策略师',
        goal: '负责选题；负责内容审核',
        backstory: '你是一位资深内容策略师。',
        tools: []
      });
    });

    it('workflow.steps 正确映射为 tasks', () => {
      const data = normalizeTeamData({
        name: '团队',
        members: [
          { role: '研究员', responsibilities: [] },
          { role: '作家', responsibilities: [] }
        ],
        workflow: {
          steps: [
            { name: '调研', description: '搜索资料', agent: '研究员' },
            { name: '写作', description: '撰写文章', agent: '作家' }
          ]
        }
      });

      const out = convertToCrewAIYaml(data);
      expect(out.crew.tasks).toHaveLength(2);
      expect(out.crew.tasks[0].agent).toBe('研究员');
      expect(out.crew.tasks[1].agent).toBe('作家');
      expect(out.crew.tasks[0].description).toContain('调研');
    });

    it('空 members 时仍输出合法结构（兜底 agent）', () => {
      const data = normalizeTeamData({ name: '空团队', members: [], workflow: {} });
      const out = convertToCrewAIYaml(data);
      expect(out.crew.agents).toHaveLength(0);
      expect(out.crew.tasks.length).toBeGreaterThanOrEqual(1);
    });

    it('workflow 含 routing 时 process 切换为 hierarchical', () => {
      const data = normalizeTeamData({
        name: 't',
        members: [{ role: 'A' }, { role: 'B' }],
        workflow: { routing: true, steps: [] }
      });
      const out = convertToCrewAIYaml(data);
      expect(out.crew.process).toBe('hierarchical');
    });

    it('导出 YAML 可被 js-yaml 重新解析（结构合法）', () => {
      const data = normalizeTeamData({
        name: 't',
        members: [{ role: 'A', responsibilities: ['x'] }],
        workflow: { steps: [{ name: 's1', description: 'do', agent: 'A' }] }
      });
      const yamlStr = yaml.dump(convertToCrewAIYaml(data));
      const back = yaml.load(yamlStr) as any;
      expect(back.crew.agents[0].role).toBe('A');
      expect(back.crew.tasks[0].description).toContain('s1');
    });
  });

  // ===========================================================
  // LangGraph JSON
  // ===========================================================
  describe('convertToLangGraphJson', () => {
    it('members 正确映射为 nodes，role 名归一化为合法 id', () => {
      const data = normalizeTeamData({
        name: 't',
        members: [
          { role: '内容策略师', responsibilities: [] }, // 中文 → agent_1
          { role: 'Data Analyst', responsibilities: [] } // 空格 → data_analyst
        ]
      });
      const out = convertToLangGraphJson(data);
      expect(out.graph.nodes).toHaveLength(2);
      expect(out.graph.nodes[0].id).toBe('agent_1');
      expect(out.graph.nodes[1].id).toBe('data_analyst');
      expect(out.graph.entry_point).toBe('agent_1');
      expect(out.graph.nodes[0].config.role).toBe('内容策略师');
    });

    it('workflow.steps 映射为 edges', () => {
      const data = normalizeTeamData({
        name: 't',
        members: [{ role: 'A' }, { role: 'B' }],
        workflow: { steps: [{ from: 'A', to: 'B', type: 'handoff' }] }
      });
      const out = convertToLangGraphJson(data);
      expect(out.graph.edges).toEqual([
        { from: 'a', to: 'b', type: 'handoff' }
      ]);
    });

    it('无 steps 时 fallback 到线性连接', () => {
      const data = normalizeTeamData({
        name: 't',
        members: [{ role: 'A' }, { role: 'B' }, { role: 'C' }],
        workflow: {}
      });
      const out = convertToLangGraphJson(data);
      expect(out.graph.edges).toEqual([
        { from: 'a', to: 'b', type: 'sequential' },
        { from: 'b', to: 'c', type: 'sequential' }
      ]);
    });

    it('空 members 时 entry_point fallback 到 "start"', () => {
      const data = normalizeTeamData({ name: '空', members: [], workflow: {} });
      const out = convertToLangGraphJson(data);
      expect(out.graph.nodes).toEqual([]);
      expect(out.graph.entry_point).toBe('start');
      expect(out.graph.edges).toEqual([]);
    });

    it('self-edge 被过滤', () => {
      const data = normalizeTeamData({
        name: 't',
        members: [{ role: 'A', responsibilities: ['x'] }],
        workflow: { steps: [{ from: 'A', to: 'A', type: 'self' }] }
      });
      const out = convertToLangGraphJson(data);
      expect(out.graph.nodes[0].id).toBe('a');
      expect(out.graph.edges).toEqual([]);
    });

    it('metadata.consumer_hint 存在且提示 langgraph 无 CLI', () => {
      const data = normalizeTeamData({ name: 't', members: [{ role: 'A' }] });
      const out = convertToLangGraphJson(data);
      expect(out.metadata.consumer_hint).toContain('LangGraph');
    });
  });

  // ===========================================================
  // ProClaw
  // ===========================================================
  describe('convertToProClawFormat', () => {
    it('输出 proclaw-team.json 兼容结构', () => {
      const data = normalizeTeamData({
        name: 't',
        members: [{ role: 'A' }],
        workflow: { steps: [] }
      });
      const out = convertToProClawFormat(data);
      expect(out.proclaw_version).toBe('1.0.0');
      expect(out.type).toBe('aiteam');
      expect(out.compatibility.min_proclaw_version).toBe('1.0.0');
      expect(out.members).toHaveLength(1);
    });
  });

  // ===========================================================
  // serializeTeamExport: 5 种格式
  // ===========================================================
  describe('serializeTeamExport', () => {
    it('json / yaml 输出原始归一化数据', () => {
      const data = normalizeTeamData({ name: 't', members: [{ role: 'A' }] });
      const json = serializeTeamExport(data, 'json');
      expect(json.extension).toBe('json');
      expect(JSON.parse(json.content).name).toBe('t');
      const y = serializeTeamExport(data, 'yaml');
      expect(y.extension).toBe('yaml');
      expect((yaml.load(y.content) as any).name).toBe('t');
    });

    it('crewai 输出 crew.yaml 结构', () => {
      const data = normalizeTeamData({
        name: 't',
        members: [{ role: 'A', responsibilities: ['x'] }]
      });
      const out = serializeTeamExport(data, 'crewai');
      expect(out.extension).toBe('yaml');
      const back = yaml.load(out.content) as any;
      expect(back.crew.agents[0].role).toBe('A');
    });

    it('langgraph 输出 team.json 结构', () => {
      const data = normalizeTeamData({
        name: 't',
        members: [{ role: 'A' }, { role: 'B' }]
      });
      const out = serializeTeamExport(data, 'langgraph');
      expect(out.extension).toBe('json');
      const back = JSON.parse(out.content);
      expect(back.graph.nodes).toHaveLength(2);
    });

    it('proclaw 输出 .proclaw-team.json 结构', () => {
      const data = normalizeTeamData({ name: 't', members: [{ role: 'A' }] });
      const out = serializeTeamExport(data, 'proclaw');
      expect(out.extension).toBe('proclaw.json');
      const back = JSON.parse(out.content);
      expect(back.proclaw_version).toBe('1.0.0');
    });
  });

  // ===========================================================
  // suggestTeamFilename
  // ===========================================================
  describe('suggestTeamFilename', () => {
    it('按格式生成正确文件名', () => {
      expect(suggestTeamFilename('增长团队', 'crewai')).toBe('增长团队.crewai.yaml');
      expect(suggestTeamFilename('增长团队', 'langgraph')).toBe('增长团队.langgraph.json');
      expect(suggestTeamFilename('增长团队', 'proclaw')).toBe('增长团队.proclaw-team.json');
      expect(suggestTeamFilename('增长团队', 'json')).toBe('增长团队.json');
    });

    it('非法字符被清洗', () => {
      // / \ : 均被移除，空格 → -
      expect(suggestTeamFilename('a/b\\c: d', 'json')).toBe('abc-d.json');
    });
  });
});

describe('ExportService.generateFile - 端到端', () => {
  let svc: any;
  let exportDir: string;

  beforeEach(() => {
    svc = new (ExportService as any)({ query: jestFn() });
    exportDir = mkdtempSync(join(tmpdir(), 'nvwax-export-'));
    svc.exportDir = exportDir;
  });

  // 极简 jest.fn 兼容（避免依赖 @jest/globals 的 jest 对象在 ESM 下作用域问题）
  function jestFn() {
    const fn: any = () => {};
    fn.mockReturnValue = () => fn;
    fn.mockResolvedValue = () => fn;
    return fn;
  }

  const formats: Array<{ format: TeamExportFormat; sample: any; ext: string }> = [
    { format: 'json', sample: { hello: 'world' }, ext: 'json' },
    { format: 'yaml', sample: { hello: 'world' }, ext: 'yaml' },
    {
      format: 'proclaw',
      sample: { proclaw_version: '1.0.0', type: 'aiteam', name: 't' },
      ext: 'proclaw.json'
    },
    {
      format: 'crewai',
      sample: {
        crew: {
          name: 't',
          agents: [{ role: 'A', goal: 'g', backstory: 'b', tools: [] }],
          tasks: [{ description: 'd', expected_output: 'o', agent: 'A' }],
          process: 'sequential'
        }
      },
      ext: 'yaml'
    },
    {
      format: 'langgraph',
      sample: {
        version: '0.1',
        schema: 'langgraph-state-graph/v1',
        graph: {
          entry_point: 'a',
          nodes: [{ id: 'a', type: 'agent', config: {} }],
          edges: [],
          finish_points: ['a']
        }
      },
      ext: 'json'
    }
  ];

  for (const { format, sample, ext } of formats) {
    it(`format=${format} 生成 ${ext} 文件且内容合法`, async () => {
      const path = await svc.generateFile('exp-' + format, sample, format);
      expect(existsSync(path)).toBe(true);
      const content = readFileSync(path, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
      expect(path.endsWith(`.${ext}`)).toBe(true);
    });
  }
});