'use client';

import dynamic from 'next/dynamic';

// ReactFlow 依赖浏览器环境，禁用 SSR
const AgentBlueprintCanvas = dynamic(
  () => import('@/components/orchestration/AgentBlueprintCanvas'),
  { ssr: false, loading: () => <div style={{ padding: 24, color: '#64748b' }}>画布加载中…</div> }
);

export default function BlueprintDemoClient() {
  return <AgentBlueprintCanvas mode="seed" />;
}
