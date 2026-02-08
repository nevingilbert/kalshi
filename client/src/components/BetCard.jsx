import React from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_STYLES = {
  OPEN: 'bg-green-100 text-green-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-400',
};

export default function BetCard({ bet, currentUserId, onAccept }) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/bet/${bet.id}`);
  };

  const handleAccept = (e) => {
    e.stopPropagation();
    onAccept(bet.id);
  };

  const canAccept =
    bet.status === 'OPEN' && currentUserId && currentUserId !== bet.creator_id;

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Proposition */}
      <p className="text-gray-900 font-medium text-base line-clamp-2 leading-snug mb-3">
        {bet.proposition}
      </p>

      {/* Stake pill */}
      <div className="mb-3">
        <span className="inline-block bg-purple-100 text-purple-800 text-sm font-semibold px-3 py-1 rounded-full">
          {bet.stake}
        </span>
      </div>

      {/* Creator + side */}
      <p className="text-sm text-gray-500 mb-3">
        <span className="font-medium text-gray-700">{bet.creator_name}</span>
        {' says '}
        <span
          className={`font-bold ${
            bet.creator_side === 'YES' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {bet.creator_side}
        </span>
      </p>

      {/* Status badge */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
            STATUS_STYLES[bet.status] || STATUS_STYLES.CANCELLED
          }`}
        >
          {bet.status}
        </span>

        {/* Winner/Loser info when resolved */}
        {bet.status === 'RESOLVED' && bet.winner_name && (
          <span className="text-xs text-gray-500">
            <span className="font-semibold text-green-700">{bet.winner_name}</span>
            {' beat '}
            <span className="font-semibold text-red-700">{bet.loser_name}</span>
          </span>
        )}
      </div>

      {/* Accept button */}
      {canAccept && (
        <button
          onClick={handleAccept}
          className="mt-3 w-full min-h-[44px] bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold text-sm rounded-lg transition-colors"
        >
          Accept Bet
        </button>
      )}
    </div>
  );
}
