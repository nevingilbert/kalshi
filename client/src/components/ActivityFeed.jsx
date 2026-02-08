import React from 'react';

const BORDER_COLORS = {
  OPEN: 'border-l-green-500',
  ACCEPTED: 'border-l-blue-500',
  RESOLVED: 'border-l-yellow-500',
  COMPLETED: 'border-l-gray-500',
  CANCELLED: 'border-l-gray-600',
};

function formatActivity(bet) {
  const prop =
    bet.proposition.length > 60
      ? bet.proposition.slice(0, 57) + '...'
      : bet.proposition;

  switch (bet.status) {
    case 'ACCEPTED':
      return (
        <>
          <span className="font-semibold text-blue-400">{bet.acceptor_name}</span>
          {' accepted '}
          <span className="font-semibold text-white">{bet.creator_name}</span>
          {"'s bet: "}
          <span className="font-semibold text-purple-300">{bet.stake}</span>
          {" on '"}
          <span className="text-gray-300">{prop}</span>
          {"'"}
        </>
      );
    case 'RESOLVED':
      return (
        <>
          <span className="font-semibold text-green-400">{bet.winner_name}</span>
          {' won against '}
          <span className="font-semibold text-red-400">{bet.loser_name}</span>
          {': '}
          <span className="font-semibold text-purple-300">{bet.stake}</span>
          {" on '"}
          <span className="text-gray-300">{prop}</span>
          {"'"}
        </>
      );
    case 'COMPLETED':
      return (
        <>
          <span className="font-semibold text-gray-300">{bet.loser_name}</span>
          {' paid up: '}
          <span className="font-semibold text-purple-300">{bet.stake}</span>
          {" on '"}
          <span className="text-gray-300">{prop}</span>
          {"'"}
        </>
      );
    case 'OPEN':
    default:
      return (
        <>
          <span className="font-semibold text-green-400">{bet.creator_name}</span>
          {' posted: '}
          <span className="font-semibold text-purple-300">{bet.stake}</span>
          {" on '"}
          <span className="text-gray-300">{prop}</span>
          {"'"}
        </>
      );
  }
}

export default function ActivityFeed({ bets }) {
  const items = (bets || []).slice(0, 10);

  if (items.length === 0) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 flex items-center justify-center">
        <p className="text-gray-400 text-xl">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-5 flex flex-col">
      <h2 className="text-2xl font-bold text-white mb-4 tracking-wide uppercase">
        Activity
      </h2>

      <div className="space-y-2 overflow-y-auto">
        {items.map((bet, index) => (
          <div
            key={bet.id + '-' + bet.status}
            className={`border-l-4 ${
              BORDER_COLORS[bet.status] || BORDER_COLORS.OPEN
            } bg-gray-700/40 rounded-r-lg px-4 py-3 ${
              index < 3 ? 'animate-slide-in' : ''
            }`}
          >
            <p className="text-lg leading-relaxed text-gray-200">
              {formatActivity(bet)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
