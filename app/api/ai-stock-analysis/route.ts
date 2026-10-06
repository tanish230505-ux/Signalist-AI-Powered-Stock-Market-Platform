import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const { symbol } = await request.json();

        if (
            typeof symbol !== "string" ||
            !/^[A-Za-z0-9.-]{1,15}$/.test(symbol)
        ) {
            return NextResponse.json(
                { error: "Please provide a valid stock symbol." },
                { status: 400 }
            );
        }

        const geminiKey = process.env.GEMINI_API_KEY;
       const finnhubKey =
       process.env.FINNHUB_API_KEY ||
       process.env.NEXT_PUBLIC_FINNHUB_API_KEY ||
       process.env.NEXT_PUBLIC_NEXT_PUBLIC_FINNHUB_API_KEY;

        if (!geminiKey || !finnhubKey) {
            return NextResponse.json(
                { error: "Missing Gemini or Finnhub API configuration in .env." },
                { status: 500 }
            );
        }

        const stockSymbol = symbol.toUpperCase();

        const [profileResponse, quoteResponse] = await Promise.all([
            fetch(
                `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(stockSymbol)}&token=${encodeURIComponent(finnhubKey)}`,
                { cache: "no-store" }
            ),
            fetch(
                `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(stockSymbol)}&token=${encodeURIComponent(finnhubKey)}`,
                { cache: "no-store" }
            ),
        ]);

        if (!profileResponse.ok || !quoteResponse.ok) {
            throw new Error("Finnhub could not retrieve the stock data.");
        }

        const [profile, quote] = await Promise.all([
            profileResponse.json(),
            quoteResponse.json(),
        ]);

        if (
            typeof quote.c !== "number" ||
            quote.c <= 0
        ) {
            return NextResponse.json(
                {
                    error: "No current quote is available for this symbol. Check the symbol or try again later.",
                },
                { status: 404 }
            );
        }

        const ai = new GoogleGenAI({ apiKey: geminiKey });

        const prompt = `
You are a financial education assistant. Analyze the stock using only the supplied data.

Stock symbol: ${stockSymbol}
Company: ${profile.name || "Not available"}
Industry: ${profile.finnhubIndustry || "Not available"}
Exchange: ${profile.exchange || "Not available"}
Current price: ${quote.c}
Previous close: ${quote.pc}
Change: ${quote.d}
Percentage change: ${quote.dp}%
Day high: ${quote.h}
Day low: ${quote.l}
Open: ${quote.o}

Write a concise, beginner-friendly analysis with these headings:
1. Company Overview
2. Current Price Movement
3. Positive Factors
4. Risks and Limitations
5. What to Watch Next

Do not invent financial facts, news, earnings, or indicators that were not supplied.
If information is missing, say so. Explain that one day's price movement is not enough
to predict future performance. Do not guarantee returns or give a definitive buy/sell
instruction. End with a short educational disclaimer.
`;

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt,
        });

        const analysis = response.text?.trim();

        if (!analysis) {
            throw new Error("Gemini returned an empty analysis.");
        }

        return NextResponse.json({
            symbol: stockSymbol,
            company: profile.name || stockSymbol,
            price: quote.c,
            changePercent: quote.dp,
            analysis,
        });
    } catch (error) {
        console.error("AI stock analysis error:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to generate stock analysis. Please try again.",
            },
            { status: 500 }
        );
    }
}