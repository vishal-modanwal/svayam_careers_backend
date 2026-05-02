import nodemailer from 'nodemailer';

const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === 'true';

const hasSmtpConfig =
  Boolean(process.env.SMTP_HOST) &&
  Boolean(process.env.SMTP_USER) &&
  Boolean(process.env.SMTP_PASS);

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const fromAddress =
  process.env.MAIL_FROM ||
  process.env.SMTP_USER ||
  'no-reply@svayam.ai';

const careersSiteUrl =
  process.env.MAIL_PRODUCT_LINK || 'https://svayam.ai';

const brandAccent = '#00d4ff';

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const handleSmtpAuthHint = (err) => {
  const msg = String(err?.message || err);
  if (/535|Invalid login|BadCredentials/i.test(msg)) {
    console.error(
      '[SMTP] Auth rejected. For Gmail: use the full email as SMTP_USER, ' +
        'and an App Password (Google Account → Security → 2-Step Verification → App passwords) as SMTP_PASS—not your normal Google password. ' +
        'Typical: SMTP_HOST=smtp.gmail.com SMTP_PORT=587 SMTP_SECURE=false'
    );
  }
};

/** Shared shell: header, hero, highlight card, body + CTA, footer (application + interview emails). */
const layoutBrandedEmail = ({
  heroH2,
  heroParagraphHtml,
  highlightHtml,
  bodyInnerHtml,
}) => {
  const year = new Date().getFullYear();
  const ctaHref = escapeHtml(careersSiteUrl.replace(/\/$/, ''));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin:0; padding:0; background:#f4f6f9; font-family:'Segoe UI',Arial,sans-serif; }
    .wrapper { max-width:620px; margin:30px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#0a0e27,#0d1230); padding:36px; text-align:center; }
    .brand { color:${brandAccent}; font-size:24px; font-weight:700; letter-spacing:-0.5px; margin:0 0 6px; }
    .header-sub { color:#a0aec0; font-size:13px; margin:0; }
    .hero { padding:36px 36px 28px; text-align:center; border-bottom:1px solid #f0f0f0; }
    .hero h2 { font-size:22px; color:#1a202c; font-weight:700; margin:0 0 8px; }
    .hero p { color:#718096; font-size:14px; line-height:1.6; margin:0; max-width:460px; display:inline-block; }
    .body { padding:0 36px 28px; }
    .section-title { font-size:12px; font-weight:700; color:#a0aec0; text-transform:uppercase; letter-spacing:0.8px; margin:24px 0 12px; }
    .next-steps { background:#fff9f0; border-radius:10px; padding:18px 20px; border:1px solid #fde8c0; margin:24px 0; }
    .next-steps p { margin:0 0 8px; color:#4a5568; font-size:13px; font-weight:600; }
    .next-steps ul { margin:0; padding-left:16px; }
    .next-steps ul li { color:#718096; font-size:13px; margin-bottom:4px; }
    .cta { text-align:center; margin:28px 0; }
    .cta a { text-decoration:none; padding:14px 36px; border-radius:10px; font-weight:700; font-size:14px; display:inline-block; color:#0a0e27; background:linear-gradient(135deg,${brandAccent},#0099cc); }
    .divider { border:none; border-top:1px solid #f0f0f0; margin:0 36px 24px; }
    .footer { background:#0a0e27; padding:24px 36px; text-align:center; }
    .footer a { color:${brandAccent}; text-decoration:none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand">svayam<span style="color:#fff">.ai</span></div>
      <p class="header-sub">Intelligent Systems for a Smarter Future</p>
    </div>

    <div class="hero">
      <h2>${heroH2}</h2>
      <p>${heroParagraphHtml}</p>
    </div>

    ${highlightHtml}

    <div class="body">
      ${bodyInnerHtml}

      <div class="cta">
        <a href="${ctaHref}">Explore careers →</a>
      </div>
    </div>

    <hr class="divider">
    <div class="footer">
      <p style="color:#a0aec0;margin-bottom:10px;">Need immediate assistance? Reach us at:</p>
      <p><a href="mailto:admin@svayam.ai">admin@svayam.ai</a> &nbsp;|&nbsp; <a href="tel:+919140072570" style="color:${brandAccent};">+91 91400 72570</a></p>
      <p style="margin-top:16px;color:#4a5568;">© ${year} Svayam Infoware Pvt. Ltd. · Lucknow, Uttar Pradesh, India</p>
    </div>
  </div>
</body>
</html>`;
};

const buildApplicationConfirmationHtml = ({
  firstName,
  jobTitle,
  status,
  email,
}) => {
  const name = escapeHtml(firstName || 'Candidate');
  const job = escapeHtml(jobTitle);
  const st = escapeHtml(status);
  const em = escapeHtml(email);

  const summaryRows = `
        <tr style="border-bottom:1px solid #edf2f7;">
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;width:120px;">Job</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;font-weight:600;">${job}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;width:120px;">Status</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;font-weight:600;">${st}</td>
        </tr>`;

  const highlightHtml = `<div style="margin:28px 36px; background:#f8fafc; border-radius:12px; padding:20px 24px; border-left:4px solid ${brandAccent};">
      <h3 style="color:#1a202c;font-size:15px;font-weight:700;margin:0 0 4px;">${job}</h3>
      <p style="color:#718096;font-size:13px;font-weight:600;margin:0 0 6px;">Role you applied for</p>
      <p style="color:#718096;font-size:12px;margin:0 0 14px;line-height:1.6;">Your application is on file with the details below. Our hiring team will review your profile and contact you for further steps.</p>
      <table style="width:100%;border-collapse:collapse;">
        ${summaryRows}
      </table>
    </div>`;

  const bodyInnerHtml = `
      <div class="section-title">What happens next?</div>
      <div class="next-steps">
        <p>Here's what to expect:</p>
        <ul>
          <li>Our hiring team will <strong>review your application</strong> against the role requirements</li>
          <li>If your profile is shortlisted, we will <strong>contact you by email or phone</strong></li>
          <li>You may receive updates as your <strong>application status</strong> changes</li>
          <li>We appreciate your interest in joining <strong>svayam.ai</strong></li>
        </ul>
      </div>

      <div class="section-title">Your submitted details</div>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;">
        <tr style="border-bottom:1px solid #edf2f7;">
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;width:120px;">Name</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;font-weight:600;">${name}</td>
        </tr>
        <tr style="border-bottom:1px solid #edf2f7;">
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;">Email</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;">${em}</td>
        </tr>
        <tr style="border-bottom:1px solid #edf2f7;">
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;">Job</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;">${job}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;">Status</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;font-weight:600;">${st}</td>
        </tr>
      </table>`;

  return layoutBrandedEmail({
    heroH2: `Thank you, ${name}! 🎉`,
    heroParagraphHtml: `Thanks for applying for <strong>${job}</strong>. We have received your application.`,
    highlightHtml,
    bodyInnerHtml,
  });
};

const buildApplicationConfirmationText = ({
  firstName,
  jobTitle,
  status,
  email,
}) => {
  const n = firstName || 'Candidate';
  const lines = [
    `Thank you, ${n}!`,
    '',
    `Thanks for applying for ${jobTitle}. We have received your application.`,
    '',
    'Job: ' + jobTitle,
    'Status: ' + status,
    '',
    'Our hiring team will review your profile and contact you for further steps.',
    '',
    'Your details:',
    `Name: ${n}`,
    `Email: ${email}`,
    '',
    `Careers: ${careersSiteUrl.replace(/\/$/, '')}`,
    '',
    'Need help? admin@svayam.ai | +91 91400 72570',
  ];
  return lines.join('\n');
};

const formatInterviewDate = (dateValue) => {
  if (!dateValue) return 'TBD';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatLinkOrLocation = (interviewLink, interviewLocation) => {
  const link = interviewLink?.trim();
  const loc = interviewLocation?.trim();
  if (link && loc) return `${link}  •  ${loc}`;
  return link || loc || 'TBD';
};

const buildInterviewScheduledHtml = ({
  firstName,
  jobTitle,
  email,
  interviewDate,
  interviewTime,
  interviewMode,
  interviewLink,
  interviewLocation,
}) => {
  const name = escapeHtml(firstName || 'Candidate');
  const job = escapeHtml(jobTitle);
  const em = escapeHtml(email);
  const dateStr = escapeHtml(formatInterviewDate(interviewDate));
  const timeStr = escapeHtml(interviewTime || 'TBD');
  const modeStr = escapeHtml(interviewMode || 'TBD');
  const linkLoc = escapeHtml(
    formatLinkOrLocation(interviewLink, interviewLocation)
  );

  const summaryRows = `
        <tr style="border-bottom:1px solid #edf2f7;">
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;width:120px;">Date</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;font-weight:600;">${dateStr}</td>
        </tr>
        <tr style="border-bottom:1px solid #edf2f7;">
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;width:120px;">Time</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;">${timeStr}</td>
        </tr>
        <tr style="border-bottom:1px solid #edf2f7;">
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;width:120px;">Mode</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;">${modeStr}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;width:120px;vertical-align:top;">Link / Location</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;word-break:break-word;">${linkLoc}</td>
        </tr>`;

  const highlightHtml = `<div style="margin:28px 36px; background:#f8fafc; border-radius:12px; padding:20px 24px; border-left:4px solid ${brandAccent};">
      <h3 style="color:#1a202c;font-size:15px;font-weight:700;margin:0 0 4px;">${job}</h3>
      <p style="color:#718096;font-size:13px;font-weight:600;margin:0 0 6px;">Interview details</p>
      <p style="color:#718096;font-size:12px;margin:0 0 14px;line-height:1.6;">Great news! You have been shortlisted for this role. Your interview has been scheduled — please review the details below. Please be on time and join using the link or reach the venue as applicable. Best of luck!</p>
      <table style="width:100%;border-collapse:collapse;">
        ${summaryRows}
      </table>
    </div>`;

  const bodyInnerHtml = `
      <div class="section-title">Before your interview</div>
      <div class="next-steps">
        <p>Please keep in mind:</p>
        <ul>
          <li>Join or arrive <strong>on time</strong> using the link or venue above</li>
          <li>Test your <strong>audio/video</strong> beforehand if the interview is online</li>
          <li>Reply to this thread or contact us if you need to <strong>reschedule</strong></li>
          <li>Good luck — we look forward to speaking with you!</li>
        </ul>
      </div>

      <div class="section-title">Your interview details</div>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;">
        <tr style="border-bottom:1px solid #edf2f7;">
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;width:120px;">Name</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;font-weight:600;">${name}</td>
        </tr>
        <tr style="border-bottom:1px solid #edf2f7;">
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;">Email</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;">${em}</td>
        </tr>
        <tr style="border-bottom:1px solid #edf2f7;">
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;">Job</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;">${job}</td>
        </tr>
        <tr style="border-bottom:1px solid #edf2f7;">
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;">Date</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;font-weight:600;">${dateStr}</td>
        </tr>
        <tr style="border-bottom:1px solid #edf2f7;">
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;">Time</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;">${timeStr}</td>
        </tr>
        <tr style="border-bottom:1px solid #edf2f7;">
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;">Mode</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;">${modeStr}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:12px;color:#a0aec0;font-weight:600;text-transform:uppercase;vertical-align:top;">Link / Location</td>
          <td style="padding:10px 14px;font-size:14px;color:#1a202c;word-break:break-word;">${linkLoc}</td>
        </tr>
      </table>`;

  return layoutBrandedEmail({
    heroH2: `Great news, ${name}! 🎉`,
    heroParagraphHtml: `You have been shortlisted for the <strong>${job}</strong> role. Your interview has been scheduled — please find the details below.`,
    highlightHtml,
    bodyInnerHtml,
  });
};

const buildInterviewScheduledText = ({
  firstName,
  jobTitle,
  email,
  interviewDate,
  interviewTime,
  interviewMode,
  interviewLink,
  interviewLocation,
}) => {
  const n = firstName || 'Candidate';
  const lines = [
    `Great news, ${n}!`,
    '',
    `You have been shortlisted for the ${jobTitle} role. Your interview has been scheduled.`,
    '',
    `Date: ${formatInterviewDate(interviewDate)}`,
    `Time: ${interviewTime || 'TBD'}`,
    `Mode: ${interviewMode || 'TBD'}`,
    `Link / Location: ${formatLinkOrLocation(interviewLink, interviewLocation)}`,
    '',
    'Please be on time and join using the link or reach the venue as applicable. Best of luck!',
    '',
    'Your details:',
    `Name: ${n}`,
    `Email: ${email}`,
    `Job: ${jobTitle}`,
    '',
    `Careers: ${careersSiteUrl.replace(/\/$/, '')}`,
    '',
    'Need help? admin@svayam.ai | +91 91400 72570',
  ];
  return lines.join('\n');
};

const sendMailRaw = async ({ to, subject, html, text }) => {
  if (!transporter) {
    console.warn('SMTP is not configured. Skipping email:', subject);
    return { skipped: true };
  }
  try {
    return await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text,
    });
  } catch (err) {
    handleSmtpAuthHint(err);
    throw err;
  }
};

export const sendApplicationConfirmationEmail = async ({
  to,
  firstName,
  jobTitle,
  status = 'Submitted',
}) =>
  sendMailRaw({
    to,
    subject: 'Application received successfully',
    html: buildApplicationConfirmationHtml({
      firstName,
      jobTitle,
      status,
      email: to,
    }),
    text: buildApplicationConfirmationText({
      firstName,
      jobTitle,
      status,
      email: to,
    }),
  });

/** Called only when application status becomes `interview_scheduled`. */
export const sendInterviewScheduledEmail = async ({
  to,
  firstName,
  jobTitle,
  interviewDate,
  interviewTime,
  interviewMode,
  interviewLink,
  interviewLocation,
}) =>
  sendMailRaw({
    to,
    subject: 'Interview scheduled',
    html: buildInterviewScheduledHtml({
      firstName,
      jobTitle,
      email: to,
      interviewDate,
      interviewTime,
      interviewMode,
      interviewLink,
      interviewLocation,
    }),
    text: buildInterviewScheduledText({
      firstName,
      jobTitle,
      email: to,
      interviewDate,
      interviewTime,
      interviewMode,
      interviewLink,
      interviewLocation,
    }),
  });
