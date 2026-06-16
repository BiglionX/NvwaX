/**
 * Activation email template (Sprint 2).
 *
 * Brand: ProClaw.
 * DoD B7: from address is "ProClaw 团队 <noreply@account.proclaw.cc>" — set in email.service.ts.
 * DoD B8: template strings are scrubbed of any "NvwaX" mention.
 * DoD B6: activation link is the only required user action; HTML+text are both sent.
 */

export type ActivationEmailInput = {
  activationLink: string;
  expiresInHours: number;
  locale?: 'zh-CN' | 'en-US';
};

const SUBJECTS: Record<'zh-CN' | 'en-US', string> = {
  'zh-CN': '激活你的 ProClaw 账户',
  'en-US': 'Activate your ProClaw account',
};

export function renderActivationEmail(input: ActivationEmailInput) {
  const locale = input.locale ?? 'zh-CN';
  const subject = SUBJECTS[locale];
  const year = new Date().getFullYear();

  if (locale === 'en-US') {
    const text = [
      'Welcome to ProClaw.',
      '',
      'Click the link below to activate your account:',
      input.activationLink,
      '',
      `This link expires in ${input.expiresInHours} hours.`,
      '',
      `© ${year} ProClaw. All rights reserved.`,
    ].join('\n');

    const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;background:#F7F8FB;color:#0F172A;padding:32px 16px;">
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fff;border:1px solid #E3E5EE;border-radius:12px;">
      <tr><td style="padding:28px 32px 0;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#0F172A;letter-spacing:-0.01em;">ProClaw</div>
        <div style="color:#5A6275;font-size:13px;margin-top:4px;">One account. Every ProClaw app.</div>
      </td></tr>
      <tr><td style="padding:24px 32px 8px;">
        <h1 style="font-size:18px;margin:0 0 12px;">Activate your ProClaw account</h1>
        <p style="margin:0 0 20px;line-height:1.55;">Click the button below to activate your account. This link expires in ${input.expiresInHours} hours.</p>
        <p style="text-align:center;margin:0 0 24px;">
          <a href="${escapeAttr(input.activationLink)}" style="display:inline-block;background:#6D4AFF;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Activate account</a>
        </p>
        <p style="font-size:13px;color:#5A6275;line-height:1.55;margin:0 0 12px;">If the button does not work, copy and paste this URL into your browser:</p>
        <p style="word-break:break-all;background:#F7F8FB;border:1px solid #E3E5EE;border-radius:6px;padding:10px 12px;font-size:12px;color:#0F172A;margin:0 0 20px;">${escapeHtml(input.activationLink)}</p>
        <p style="font-size:12px;color:#5A6275;line-height:1.5;margin:0;">If you did not create a ProClaw account, you can safely ignore this email.</p>
      </td></tr>
      <tr><td style="padding:16px 32px 28px;border-top:1px solid #E3E5EE;font-size:12px;color:#5A6275;">
        © ${year} ProClaw. All rights reserved.
      </td></tr>
    </table>
  </body>
</html>`;
    return { subject, html, text };
  }

  // zh-CN (default)
  const text = [
    '欢迎使用 ProClaw。',
    '',
    '点击下方链接激活你的账户：',
    input.activationLink,
    '',
    `链接 ${input.expiresInHours} 小时内有效。`,
    '',
    `© ${year} ProClaw. All rights reserved.`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="zh-CN">
  <body style="margin:0;font-family:Inter,system-ui,-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;background:#F7F8FB;color:#0F172A;padding:32px 16px;">
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fff;border:1px solid #E3E5EE;border-radius:12px;">
      <tr><td style="padding:28px 32px 0;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#0F172A;letter-spacing:-0.01em;">ProClaw</div>
        <div style="color:#5A6275;font-size:13px;margin-top:4px;">One account. Every ProClaw app.</div>
      </td></tr>
      <tr><td style="padding:24px 32px 8px;">
        <h1 style="font-size:18px;margin:0 0 12px;">激活你的 ProClaw 账户</h1>
        <p style="margin:0 0 20px;line-height:1.55;">点击下方按钮完成激活。链接 ${input.expiresInHours} 小时内有效，过期请重新申请。</p>
        <p style="text-align:center;margin:0 0 24px;">
          <a href="${escapeAttr(input.activationLink)}" style="display:inline-block;background:#6D4AFF;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">激活账户</a>
        </p>
        <p style="font-size:13px;color:#5A6275;line-height:1.55;margin:0 0 12px;">如果按钮无法打开，请复制以下链接到浏览器：</p>
        <p style="word-break:break-all;background:#F7F8FB;border:1px solid #E3E5EE;border-radius:6px;padding:10px 12px;font-size:12px;color:#0F172A;margin:0 0 20px;">${escapeHtml(input.activationLink)}</p>
        <p style="font-size:12px;color:#5A6275;line-height:1.5;margin:0;">如果你没有注册 ProClaw 账户，可以忽略此邮件。</p>
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

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
