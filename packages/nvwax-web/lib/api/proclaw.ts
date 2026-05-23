export interface ProClawTeamConfig {
  teamName: string;
  teamConfig: Record<string, unknown>;
  metadata?: {
    source: string;
    createdAt: string;
    [key: string]: unknown;
  };
}

export interface ProClawExportResult {
  success: boolean;
  proClawAppId?: string;
  downloadUrl?: string;
  message?: string;
}

/**
 * 生成团队配置文件并触发浏览器下载
 * 用户下载后在 ProClaw 桌面应用中导入
 */
export function downloadTeamConfig(config: ProClawTeamConfig): boolean {
  try {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const filename = `${sanitizeFilename(config.teamName)}.proclaw-team.json`;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to download team config:', err);
    return false;
  }
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff\-_.]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 80)
    || 'ai-team';
}
