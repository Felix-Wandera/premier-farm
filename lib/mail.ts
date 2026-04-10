import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";

/**
 * Shared Nodemailer Transporter
 */
const getTransporter = () => {
    if (!process.env.SMTP_HOST) {
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

interface MailOptions {
    to: string;
    subject: string;
    template: 'invite' | 'reset';
    data: Record<string, string>;
    fromName?: string;
}

/**
 * Loads and renders an email template with placeholders.
 */
async function renderTemplate(name: string, data: Record<string, string>) {
    try {
        const templatesDir = path.join(process.cwd(), "lib", "mail", "templates");
        
        // Load skeleton and specific template
        const skeleton = await fs.readFile(path.join(templatesDir, "skeleton.html"), "utf-8");
        const content = await fs.readFile(path.join(templatesDir, `${name}.html`), "utf-8");

        // Inject content into skeleton
        let html = skeleton.replace("{{content}}", content);

        // Replace all placeholders
        Object.entries(data).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, "g");
            html = html.replace(regex, value);
        });

        return html;
    } catch (error) {
        console.error(`[TEMPLATE ERROR] Failed to render template ${name}:`, error);
        throw new Error(`Email template rendering failed: ${name}`);
    }
}

/**
 * Sends an email using the centralized SMTP configuration and templates.
 */
export async function sendEmail({ to, subject, template, data, fromName = "Premier Farm" }: MailOptions) {
    const transporter = getTransporter();
    
    // Render the HTML using the template engine
    const html = await renderTemplate(template, data);

    if (!transporter) {
        console.warn(`[MAIL SKIP] To: ${to} | SMTP_HOST not configured. logging to console.`);
        console.log(`--- EMAIL PREVIEW [Template: ${template}] ---`);
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`---------------------`);
        return { success: false, message: "SMTP configuration is missing on the server. Email logged to console." };
    }

    // Create a basic plain-text fallback by stripping HTML tags
    const textFallback = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles completely
        .replace(/<[^>]+>/g, '\n') // Replace HTML tags with newlines
        .replace(/^\s*[\r\n]/gm, '') // Clean up empty lines
        .trim();

    try {
        const info = await transporter.sendMail({
            from: `"${fromName}" <${process.env.SMTP_USER || "admin@premierfarm.co.ke"}>`,
            to,
            subject,
            html,
            text: textFallback,
        });

        console.log(`[MAIL SENT] MessageID: ${info.messageId} | Template: ${template} | To: ${to}`);
        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        console.error(`[MAIL ERROR] Failed to send ${template} email to ${to}:`, error.message);
        return { success: false, message: error.message || "Unknown SMTP error" };
    }
}
