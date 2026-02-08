import React, { useState, useEffect } from 'react';

export default function OpenBetsTicker({ bets }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);

  const openBets = bets || [];

  useEffect(() => {
    if (openBets.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % openBets.length);
      setFadeKey((prev) => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [openBets.length]);

  // Reset index if bets array shrinks
  useEffect(() => {
    if (currentIndex >= openBets.length) {
      setCurrentIndex(0);
    }
  }, [openBets.length, currentIndex]);

  if (openBets.length === 0) {
    return (
      <div className="w-full bg-gray-800 rounded-2xl p-8 border border-gray-700 flex items-center justify-center">
        <p className="text-2xl text-gray-400 text-center">
          No open bets &mdash; create one on your phone!
        </p>
      </div>
    );
  }

  const bet = openBets[currentIndex];

  return (
    <div className="w-full bg-gray-800 rounded-2xl p-8 border border-gray-700 relative overflow-hidden">
      {/* Accent gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500" />

      <div key={fadeKey} className="animate-fade-in">
        {/* Proposition */}
        <p className="text-3xl lg:text-4xl font-bold text-white leading-snug mb-5">
          {bet.proposition}
        </p>

        {/* Stake pill */}
        <div className="mb-4">
          <span className="inline-block bg-purple-600/30 border border-purple-500 text-purple-300 text-xl lg:text-2xl font-bold px-5 py-2 rounded-full">
            {bet.stake}
          </span>
        </div>

        {/* Creator info */}
        <p className="text-xl text-gray-300 mb-2">
          <span className="font-semibold text-white">{bet.creator_name}</span>
          {' says '}
          <span
            className={`font-bold ${
              bet.creator_side === 'YES' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {bet.creator_side}
          </span>
        </p>

        {/* Waiting subtitle */}
        <p className="text-lg text-gray-500 italic">
          Waiting for a challenger...
        </p>
      </div>

      {/* Pagination dots */}
      {openBets.length > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {openBets.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex ? 'bg-white' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
