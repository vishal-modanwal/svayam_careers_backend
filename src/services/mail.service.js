import nodemailer from 'nodemailer';
import Mailgen from 'mailgen';

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

const mailGenerator = new Mailgen({
  theme: 'default',
  product: {
    name: process.env.MAIL_PRODUCT_NAME || 'svayam.ai',
    link: process.env.MAIL_PRODUCT_LINK || 'http://localhost:4200',
  },
});

const fromAddress =
  process.env.MAIL_FROM ||
  process.env.SMTP_USER ||
  'no-reply@svayam.ai';

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

const sendMail = async ({ to, subject, body }) => {
  if (!transporter) {
    console.warn('SMTP is not configured. Skipping email:', subject);
    return { skipped: true };
  }

  const mail = { body };
  const html = mailGenerator.generate(mail);
  const text = mailGenerator.generatePlaintext(mail);

  return transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    html,
    text,
  });
};

export const sendApplicationConfirmationEmail = async ({
  to,
  firstName,
  jobTitle,
  status = 'Submitted',
}) =>
  sendMail({
    to,
    subject: 'Application received successfully',
    body: {
      name: firstName || 'Candidate',
      intro: `Thanks for applying for ${jobTitle}. We have received your application.`,
      table: {
        data: [
          { field: 'Job', value: jobTitle },
          { field: 'Status', value: status },
        ],
      },
      outro:
        'Our hiring team will review your profile and contact you for further steps.',
    },
  });

const formatLinkOrLocation = (interviewLink, interviewLocation) => {
  const link = interviewLink?.trim();
  const loc = interviewLocation?.trim();
  if (link && loc) return `${link}  •  ${loc}`;
  return link || loc || 'TBD';
};

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
  sendMail({
    to,
    subject: 'Interview scheduled',
    body: {
      name: firstName || 'Candidate',
      intro: `Great news! You have been shortlisted for the ${jobTitle} role. Your interview has been scheduled — please find the details below.`,
      table: {
        data: [
          { field: 'Date', value: formatInterviewDate(interviewDate) },
          { field: 'Time', value: interviewTime || 'TBD' },
          { field: 'Mode', value: interviewMode || 'TBD' },
          {
            field: 'Link / Location',
            value: formatLinkOrLocation(interviewLink, interviewLocation),
          },
        ],
      },
      outro:
        'Please be on time and join using the link or reach the venue as applicable. Best of luck!',
    },
  });
