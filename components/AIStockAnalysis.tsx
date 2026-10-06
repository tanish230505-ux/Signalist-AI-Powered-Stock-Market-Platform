
"use client";

import { useState } from "react";

type AnalysisResult = {
    symbol: string;
    company: string;
    price: number;
    changePercent: number;
    analysis: string;
};

export default function AIStockAnalysis({
    symbol,
}: {
    symbol: string;
}) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState("");

    async function analyzeStock() {
        setLoading(true);
        setError("");
        setResult(null);

        try {
            const response = await fetch("/api/ai-stock-analysis", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ symbol }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Failed to analyze this stock."
                );
            }

            setResult(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="my-8 rounded-2xl border border-blue-500/30 bg-gray-900 p-5 text-white sm:p-6">
            <div className="mb-4">
                <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
                    Gemini AI
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                    AI Stock Analysis
                </h2>

                <p className="mt-2 text-sm text-gray-300">
                    Get an AI-generated explanation of {symbol.toUpperCase()},
                    using its latest available quote and company profile.
                </p>
            </div>

            <button
                type="button"
                onClick={analyzeStock}
                disabled={loading}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? "Analyzing stock..." : "Analyze with AI"}
            </button>

            {loading && (
                <p className="mt-4 text-sm text-gray-300">
                    Fetching stock data and generating analysis. Please wait...
                </p>
            )}

            {error && (
                <div
                    role="alert"
                    className="mt-4 rounded-lg border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200"
                >
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-6">
                    <div className="mb-5 rounded-lg bg-gray-800 p-4">
                        <h3 className="text-lg font-bold">
                            {result.company} ({result.symbol})
                        </h3>

                        <p className="mt-2">
                            Latest quote: {result.price}
                        </p>

                        <p
                            className={
                                result.changePercent > 0
                                    ? "text-green-400"
                                    : result.changePercent < 0
                                      ? "text-red-400"
                                      : "text-gray-300"
                            }
                        >
                            Daily change: {result.changePercent}%
                        </p>
                    </div>

                    <h3 className="mb-3 text-lg font-bold">
                        Analysis Results
                    </h3>

                    <div className="whitespace-pre-wrap break-words leading-7 text-gray-200">
                        {result.analysis}
                    </div>

                    <p className="mt-5 border-t border-gray-700 pt-4 text-xs text-gray-400">
                        AI-generated information may be incomplete or inaccurate.
                        This is for educational purposes only, not financial advice.
                    </p>
                </div>
            )}
        </section>
    );
}