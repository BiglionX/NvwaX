import BlueprintDemoClient from './Client';

/**
 * 蓝图 Demo 页面（Phase 3 画布演示）
 * ------------------------------------------------------------
 * 用法：/en/blueprint-demo 或 /zh/blueprint-demo
 * 模式：seed（本地状态，无 API 依赖，便于演示/验证）
 */
export default function BlueprintDemoPage() {
  return (
    <main style={{ padding: '80px 24px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>智能体创建结果蓝图 · 画布演示</h1>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
        借鉴 deshwalmahesh 交互形态（挂载面板 + Draft/Deploy 门禁），自研 ReactFlow 画布。
        点击左侧项目挂载，挂载项实时出现在画布上；顶栏 Deploy 执行服务端门禁校验。
      </p>
      <BlueprintDemoClient />
    </main>
  );
}
