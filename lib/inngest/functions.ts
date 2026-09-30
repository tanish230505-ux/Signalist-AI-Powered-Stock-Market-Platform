import { GoogleGenAI } from "@google/genai";
import { inngest } from "@/lib/inngest/client";

import {
    NEWS_SUMMARY_EMAIL_PROMPT,
    PERSONALIZED_WELCOME_EMAIL_PROMPT,
} from "@/lib/inngest/prompts";

import {
    sendNewsSummaryEmail,
    sendWelcomeEmail,
} from "@/lib/nodemailer";

import { getAllUsersForNewsEmail } from "@/lib/actions/user.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getNews } from "@/lib/actions/finnhub.actions";
import { getFormattedTodayDate } from "@/lib/utils";

type UserForNewsEmail = {
    email: string;
    name: string;
};

// Gemini client
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});


// ======================================================
// SIGN UP EMAIL
// ======================================================

export const sendSignUpEmail = inngest.createFunction(
    { id: "sign-up-email" },
    { event: "app/user.created" },

    async ({ event, step }) => {

        const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `;

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace(
            "{{userProfile}}",
            userProfile
        );

        // Generate welcome email content directly with Gemini
        const response = await step.run(
            "generate-welcome-intro",
            async () => {
                return await ai.models.generateContent({
                    model: "gemini-2.5-flash-lite",
                    contents: prompt,
                });
            }
        );

        await step.run(
            "send-welcome-email",
            async () => {

                const introText =
                    response.text ||
                    "Thanks for joining Signalist. You now have the tools to track markets and make smarter moves.";

                const {
                    data: {
                        email,
                        name,
                    },
                } = event;

                return await sendWelcomeEmail({
                    email,
                    name,
                    intro: introText,
                });
            }
        );

        return {
            success: true,
            message: "Welcome email sent successfully",
        };
    }
);


// ======================================================
// DAILY NEWS SUMMARY
// ======================================================

export const sendDailyNewsSummary = inngest.createFunction(
    { id: "daily-news-summary" },

    [
        { event: "app/send.daily.news" },
        { cron: "0 12 * * *" },
    ],

    async ({ step }) => {

        // ==================================================
        // STEP 1: GET ALL USERS
        // ==================================================

        const users = (await step.run(
            "get-all-users",
            getAllUsersForNewsEmail
        )) as UserForNewsEmail[];

        if (!users || users.length === 0) {

            return {
                success: false,
                message: "No users found for news email",
            };

        }


        // ==================================================
        // STEP 2: GET NEWS FOR EACH USER
        // ==================================================

        const results = await step.run(
            "fetch-user-news",

            async () => {

                const perUser: Array<{
                    user: UserForNewsEmail;
                    articles: MarketNewsArticle[];
                }> = [];

                for (const user of users) {

                    try {

                        // Get user's watchlist
                        const symbols =
                            await getWatchlistSymbolsByEmail(
                                user.email
                            );

                        // Get news for watchlist
                        let articles =
                            await getNews(symbols);

                        // Maximum 6 articles
                        articles =
                            (articles || []).slice(0, 6);


                        // If no watchlist news,
                        // get general market news
                        if (
                            !articles ||
                            articles.length === 0
                        ) {

                            articles =
                                await getNews();

                            articles =
                                (articles || []).slice(0, 6);
                        }


                        perUser.push({
                            user,
                            articles,
                        });

                    } catch (error) {

                        console.error(
                            "daily-news: error preparing user news",
                            user.email,
                            error
                        );

                        perUser.push({
                            user,
                            articles: [],
                        });
                    }
                }

                return perUser;
            }
        );


        // ==================================================
        // STEP 3: SUMMARIZE NEWS WITH GEMINI
        // ==================================================

        const userNewsSummaries: {
            user: UserForNewsEmail;
            newsContent: string | null;
        }[] = [];


        for (
            const { user, articles }
            of results
        ) {

            try {

                const prompt =
                    NEWS_SUMMARY_EMAIL_PROMPT.replace(
                        "{{newsData}}",
                        JSON.stringify(
                            articles,
                            null,
                            2
                        )
                    );


                // Direct Gemini API call
                const response = await step.run(
                    `summarize-news-${user.email}`,

                    async () => {

                        return await ai.models.generateContent({
                            model: "gemini-2.5-flash-lite",
                            contents: prompt,
                        });

                    }
                );


                const newsContent =
                    response.text ||
                    "No market news.";


                userNewsSummaries.push({
                    user,
                    newsContent,
                });


            } catch (error) {

                console.error(
                    "Failed to summarize news for:",
                    user.email,
                    error
                );

                userNewsSummaries.push({
                    user,
                    newsContent: null,
                });
            }
        }


        // ==================================================
        // STEP 4: SEND NEWS EMAILS
        // ==================================================

        await step.run(
            "send-news-emails",

            async () => {

                await Promise.all(

                    userNewsSummaries.map(
                        async ({
                            user,
                            newsContent,
                        }) => {

                            if (!newsContent) {
                                return false;
                            }


                            return await sendNewsSummaryEmail({

                                email: user.email,

                                date:
                                    getFormattedTodayDate(),

                                newsContent,
                            });

                        }
                    )

                );

            }
        );


        return {
            success: true,
            message:
                "Daily news summary emails sent successfully",
        };
    }
);