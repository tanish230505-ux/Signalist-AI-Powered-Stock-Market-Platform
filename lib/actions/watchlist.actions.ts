"use server";

import { connectToDatabase } from "@/database/mongoose";
import { Watchlist } from "@/database/models/watchlist.model";

async function getUserIdByEmail(email: string) {
  if (!email) return null;

  const mongoose = await connectToDatabase();
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB connection not found");
  }

  const user = await db
    .collection("user")
    .findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

  if (!user) return null;

  return user.id || String(user._id || "");
}

export async function addToWatchlist(
  email: string,
  symbol: string,
  company: string
) {
  try {
    const userId = await getUserIdByEmail(email);

    if (!userId) {
      return { success: false, message: "User not found" };
    }

    await Watchlist.findOneAndUpdate(
      { userId, symbol: symbol.toUpperCase() },
      {
        userId,
        symbol: symbol.toUpperCase(),
        company,
        addedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      }
    );

    return { success: true };
  } catch (error) {
    console.error("addToWatchlist error:", error);
    return { success: false, message: "Failed to add stock" };
  }
}

export async function removeFromWatchlist(
  email: string,
  symbol: string
) {
  try {
    const userId = await getUserIdByEmail(email);

    if (!userId) {
      return { success: false, message: "User not found" };
    }

    await Watchlist.deleteOne({
      userId,
      symbol: symbol.toUpperCase(),
    });

    return { success: true };
  } catch (error) {
    console.error("removeFromWatchlist error:", error);
    return { success: false, message: "Failed to remove stock" };
  }
}

export async function getWatchlistSymbolsByEmail(
  email: string
): Promise<string[]> {
  if (!email) return [];

  try {
    const userId = await getUserIdByEmail(email);

    if (!userId) return [];

    const items = await Watchlist.find(
      { userId },
      { symbol: 1 }
    ).lean();

    return items.map((item) => String(item.symbol));
  } catch (error) {
    console.error("getWatchlistSymbolsByEmail error:", error);
    return [];
  }
}