import nodemailer from "nodemailer";
import {
    WELCOME_EMAIL_TEMPLATE,
    NEWS_SUMMARY_EMAIL_TEMPLATE,
} from "@/lib/nodemailer/templates";

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.NODEMAILER_EMAIL!,
        pass: process.env.NODEMAILER_PASSWORD!,
    },
});

// Test Gmail SMTP connection
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Gmail SMTP connection failed:", error);
    } else {
        console.log("✅ Gmail SMTP connection successful");
    }
});

export const sendWelcomeEmail = async ({
    email,
    name,
    intro,
}: WelcomeEmailData) => {
    const htmlTemplate = WELCOME_EMAIL_TEMPLATE
        .replace("{{name}}", name)
        .replace("{{intro}}", intro);

    const mailOptions = {
        from: `"Signalist" <${process.env.NODEMAILER_EMAIL}>`,
        to: email,
        subject: "Welcome to Signalist - your stock market toolkit is ready!",
        text: "Thanks for joining Signalist",
        html: htmlTemplate,
    };

    const result = await transporter.sendMail(mailOptions);

    console.log("✅ Welcome email sent successfully");
    console.log("📧 Message ID:", result.messageId);
    console.log("📧 Sent to:", email);
};

export const sendNewsSummaryEmail = async ({
    email,
    date,
    newsContent,
}: {
    email: string;
    date: string;
    newsContent: string;
}): Promise<void> => {
    const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE
        .replace("{{date}}", date)
        .replace("{{newsContent}}", newsContent);

    const mailOptions = {
        from: `"Signalist News" <${process.env.NODEMAILER_EMAIL}>`,
        to: email,
        subject: `📈 Market News Summary Today - ${date}`,
        text: "Today's market news summary from Signalist",
        html: htmlTemplate,
    };

    const result = await transporter.sendMail(mailOptions);

    console.log("✅ News summary email sent successfully");
    console.log("📧 Message ID:", result.messageId);
    console.log("📧 Sent to:", email);
};