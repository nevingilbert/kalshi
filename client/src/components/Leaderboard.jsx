import React from 'react';

const RANK_STYLES = {
  0: 'bg-yellow-500/20 border-l-4 border-yellow-400',
  1: 'bg-gray-400/15 border-l-4 border-gray-400',
  2: 'bg-amber-600/15 border-l-4 border-amber-600',
};

export default function Leaderboard({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 h-full flex items-center justify-center">
        <p className="text-gray-400 text-xl">No bets settled yet</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-5 h-full flex flex-col">
      <h2 className="text-2xl font-bold text-white mb-4 tracking-wide uppercase">
        Leaderboard
      </h2>

      {/* Header */}
      <div className="grid grid-cols-[3rem_1fr_3rem_3rem_5rem] gap-2 px-3 pb-2 border-b border-gray-700">
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          #
        </span>
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          Name
        </span>
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold text-center">
          W
        </span>
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold text-center">
          L
        </span>
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold text-center">
          Owes
        </span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto space-y-1 mt-2">
        {data.map((player, index) => {
          const rankStyle = RANK_STYLES[index] || '';
          const hasDebt = player.outstanding > 0;

          return (
            <div
              key={player.id}
              className={`grid grid-cols-[3rem_1fr_3rem_3rem_5rem] gap-2 items-center px-3 py-3 rounded-lg ${rankStyle}`}
            >
              <span className="text-lg font-bold text-gray-300">
                {index + 1}
              </span>
              <span className="text-xl font-semibold text-white truncate">
                {player.name}
              </span>
              <span className="text-lg font-bold text-green-400 text-center">
                {player.wins}
              </span>
              <span className="text-lg font-bold text-red-400 text-center">
                {player.losses}
              </span>
              <span
                className={`text-lg font-bold text-center ${
                  hasDebt ? 'text-red-500 animate-pulse' : 'text-gray-500'
                }`}
              >
                {player.outstanding}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
