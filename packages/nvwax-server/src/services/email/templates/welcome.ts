/**
 * Welcome email template (Sprint 2).
 *
 * Sent right after a successful activation.
 * DoD B8: no "NvwaX" reference.
 */

export type WelcomeEmailInput = {
  displayName?: string;
  locale?: 'zh-CN' | 'en-US';
};

const SUBJECTS: Record<'zh-CN' | 'en-US', string> = {
  'zh-CN': '欢迎加入 ProClaw',
  'en-US': 'Welcome to ProClaw',
};

export function renderWelcomeEmail(input: WelcomeEmailInput) {
  const locale = input.locale ?? 'zh-CN';
  const subject = SUBJECTS[locale];
  const year = new Date().getFullYear();
  const greetingName = input.displayName?.trim() || (locale === 'en-US' ? 'there' : '用户');

  if (locale === 'en-US') {
    const text = [
      `Hi ${greetingName},`,
      '',
      'Your ProClaw account is now active. You can sign in to any ProClaw app with this email.',
      '',
      `© ${year} ProClaw. All rights reserved.`,
    ].join('\n');
    const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;background:#F7F8FB;color:#0F172A;padding:32px 16px;">
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fff;border:1px solid #E3E5EE;border-radius:12px;">
      <tr><td style="padding:28px 32px 0;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#0F172A;">ProClaw</div>
      </td></tr>
      <tr><td style="padding:24px 32px 8px;">
        <h1 style="font-size:18px;margin:0 0 12px;">Welcome aboard, ${escapeHtml(greetingName)}</h1>
        <p style="margin:0 0 16px;line-height:1.55;">Your ProClaw account is now active. You can sign in to any ProClaw app with this email.</p>
        <p style="margin:0;line-height:1.55;">Need help? Reply to this email and we'll be glad to assist.</p>
      </td></tr>
      <tr><td style="padding:16px 32px 28px;border-top:1px solid #E3E5EE;font-size:12px;color:#5A6275;">
        © ${year} ProClaw. All rights reserved.
      </td></tr>
    </table>
  </body>
</html>`;
    return { subject, html, text };
  }

  const text = [
    `${greetingName}，你好。`,
    '',
    '你的 ProClaw 账户已激活，可以使用此邮箱登录任意 ProClaw 应用。',
    '',
    `© ${year} ProClaw. All rights reserved.`,
  ].join('\n');
  const html = `<!doctype html>
<html lang="zh-CN">
  <body style="margin:0;font-family:Inter,system-ui,-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;background:#F7F8FB;color:#0F172A;padding:32px 16px;">
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fff;border:1px solid #E3E5EE;border-radius:12px;">
      <tr><td style="padding:28px 32px 0;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#0F172A;">ProClaw</div>
      </td></tr>
      <tr><td style="padding:24px 32px 8px;">
        <h1 style="font-size:18px;margin:0 0 12px;">${escapeHtml(greetingName)}，欢迎加入 ProClaw</h1>
        <p style="margin:0 0 16px;line-height:1.55;">你的 ProClaw 账户已激活，可以使用此邮箱登录任意 ProClaw 应用。</p>
        <p style="margin:0;line-height:1.55;">遇到问题？直接回复此邮件，我们随时提供帮助。</p>
      </td></tr>
      <tr><td style="padding:16px 32px 28px;border-top:1px solid #E3E5EE;font-size:12px;color:#5A6275;">
        © ${year} ProClaw. All rights reserved.
      </td></tr>
    </table>
  </body>
</html>`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
