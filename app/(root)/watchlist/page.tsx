import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";

const WatchlistPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const symbols = await getWatchlistSymbolsByEmail(session.user.email);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-white">My Watchlist</h1>
        <p className="mt-2 text-gray-400">
          Stocks you are currently following.
        </p>
      </div>

      {symbols.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-[#141414] p-10 text-center">
          <h2 className="text-xl font-semibold text-white">
            Your watchlist is empty
          </h2>

          <p className="mt-2 text-gray-400">
            Add stocks to your watchlist to see them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {symbols.map((symbol) => (
            <div
              key={symbol}
              className="rounded-xl border border-gray-800 bg-[#141414] p-6"
            >
              <h2 className="text-xl font-bold text-white">{symbol}</h2>

              <p className="mt-2 text-gray-400">
                Stock added to your watchlist
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WatchlistPage;
