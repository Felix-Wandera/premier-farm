/**
 * Diagnostic Email Test Script
 * Usage: node scripts/test-mail.js recipient@example.com
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const recipient = process.argv[2];

if (!recipient || !recipient.includes('@')) {
    console.error("\x1b[31mError: Please provide a valid recipient email address.\x1b[0m");
    console.log("Usage: node scripts/test-mail.js recipient@example.com");
    process.exit(1);
}

console.log(`\n\x1b[34m--- Premier Farm Mail Diagnostic ---\x1b[0m`);
console.log(`Target Recipient: ${recipient}`);
console.log(`SMTP Host: ${process.env.SMTP_HOST}`);
console.log(`SMTP User: ${process.env.SMTP_USER}`);
console.log(`SMTP Port: ${process.env.SMTP_PORT}`);
console.log(`------------------------------------\n`);

if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.error("\x1b[31mError: SMTP environment variables are missing in .env\x1b[0m");
    process.exit(1);
}

async function render(name, data) {
    const templatesDir = path.join(process.cwd(), "lib", "mail", "templates");
    const skeleton = fs.readFileSync(path.join(templatesDir, "skeleton.html"), "utf-8");
    const content = fs.readFileSync(path.join(templatesDir, `${name}.html`), "utf-8");
    let html = skeleton.replace("{{content}}", content);
    Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        html = html.replace(regex, value);
    });
    return html;
}

async function runTest() {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        logger: true, // Internal nodemailer logging
        debug: true   // Include SMTP transcript
    });

    try {
        console.log(`\x1b[33m[1/2] Testing INVITATION email...\x1b[0m`);
        const inviteHtml = await render('invite', { link: "http://localhost:3000/accept-invite?token=test-token" });
        await transporter.sendMail({
            from: `"Premier Farm Test" <${process.env.SMTP_USER}>`,
            to: recipient,
            subject: "Diagnostic Test: Invitation",
            html: inviteHtml
        });
        console.log(`\x1b[32m✔ Invitation sent successfully!\x1b[0m\n`);

        console.log(`\x1b[33m[2/2] Testing PASSWORD RESET email...\x1b[0m`);
        const resetHtml = await render('reset', { link: "http://localhost:3000/login/reset?token=test-token" });
        await transporter.sendMail({
            from: `"Premier Farm Test" <${process.env.SMTP_USER}>`,
            to: recipient,
            subject: "Diagnostic Test: Password Reset",
            html: resetHtml
        });
        console.log(`\x1b[32m✔ Password Reset sent successfully!\x1b[0m\n`);

        console.log(`\x1b[35mDiagnostic Complete! Check your inbox (and spam folder).\x1b[0m`);
    } catch (e) {
        console.error(`\n\x1b[31m✖ SMTP FAILURE: ${e.message}\x1b[0m`);
        if (e.code) console.log(`Error Code: ${e.code}`);
        if (e.command) console.log(`Last Command: ${e.command}`);
        process.exit(1);
    }
}

runTest();
