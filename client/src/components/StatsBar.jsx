import React from 'react';

const STAT_CARDS = [
  {
    key: 'open_bets',
    label: 'Open Bets',
    accent: 'from-green-500/20 to-green-600/5 border-green-500/30',
    textColor: 'text-green-400',
  },
  {
    key: 'active_bets',
    label: 'Active Bets',
    accent: 'from-blue-500/20 to-blue-600/5 border-blue-500/30',
    textColor: 'text-blue-400',
  },
  {
    key: 'resolved_bets',
    label: 'Resolved',
    accent: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/30',
    textColor: 'text-yellow-400',
  },
  {
    key: 'total_users',
    label: 'Players',
    accent: 'from-purple-500/20 to-purple-600/5 border-purple-500/30',
    textColor: 'text-purple-400',
  },
];

export default function StatsBar({ stats }) {
  const data = stats || {};

  return (
    <div className="grid grid-cols-4 gap-4 w-full">
      {STAT_CARDS.map((card) => (
        <div
          key={card.key}
          className={`bg-gradient-to-br ${card.accent} border rounded-2xl p-5 flex flex-col items-center justify-center`}
        >
          <span className="text-sm uppercase tracking-widest text-gray-400 font-semibold mb-1">
            {card.label}
          </span>
          <span className={`text-4xl lg:text-5xl font-extrabold ${card.textColor}`}>
            {data[card.key] ?? 0}
          </span>
        </div>
      ))}
    </div>
  );
}
