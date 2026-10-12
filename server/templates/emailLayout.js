// Turns a small "content model" into an HTML email and a plain-text twin.
// Templates (emailTemplates.js) describe WHAT to say; this file decides how it LOOKS.
// Email clients ignore most CSS, so styles are inline and the layout is a simple table.

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const renderEmail = (content, appUrl) => {
  const { subject, heading, paragraphs = [], details = [], cta, footnote } = content;
  const link = cta ? `${appUrl}${cta.path}` : null;

  const paragraphHtml = paragraphs
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#374151;">${escapeHtml(p)}</p>`)
    .join('');

  const detailsHtml = details.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="margin:6px 0 18px;background:#f4f6fb;border-radius:10px;">
         ${details.map(([label, value]) => `
           <tr>
             <td style="padding:10px 14px;color:#6b7280;font-size:13px;width:38%;">${escapeHtml(label)}</td>
             <td style="padding:10px 14px;color:#111827;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
           </tr>`).join('')}
       </table>`
    : '';

  const buttonHtml = cta
    ? `<p style="margin:22px 0 4px;">
         <a href="${escapeHtml(link)}"
            style="background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block;">
           ${escapeHtml(cta.label)}
         </a>
       </p>`
    : '';

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0"
               style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;border:1px solid #e8ebf3;">
          <tr><td style="background:#111936;color:#ffffff;padding:18px 28px;border-radius:14px 14px 0 0;font-size:17px;font-weight:700;">
            🎓 Placement Cell Portal
          </td></tr>
          <tr><td style="padding:28px;">
            <h1 style="margin:0 0 16px;font-size:21px;color:#111827;">${escapeHtml(heading)}</h1>
            ${paragraphHtml}
            ${detailsHtml}
            ${buttonHtml}
            ${footnote ? `<p style="margin:18px 0 0;font-size:12px;color:#6b7280;">${escapeHtml(footnote)}</p>` : ''}
          </td></tr>
          <tr><td style="padding:16px 28px;border-top:1px solid #e8ebf3;font-size:12px;color:#9ca3af;">
            You are receiving this because you have an account on the Placement Cell Portal.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    heading, '',
    ...paragraphs, ...(paragraphs.length ? [''] : []),
    ...details.map(([label, value]) => `${label}: ${value}`), ...(details.length ? [''] : []),
    ...(link ? [`${cta.label}: ${link}`, ''] : []),
    ...(footnote ? [footnote, ''] : []),
    '- Placement Cell Portal',
  ].join('\n');

  return { subject, html, text };
};
