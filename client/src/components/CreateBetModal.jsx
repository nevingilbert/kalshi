import React, { useState } from 'react';
import { api } from '../api';

export default function CreateBetModal({ onClose, userId }) {
  const [proposition, setProposition] = useState('');
  const [stake, setStake] = useState('');
  const [creatorSide, setCreatorSide] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setProposition('');
    setStake('');
    setCreatorSide(null);
    setError('');
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!proposition.trim()) {
      setError('Please enter a proposition.');
      return;
    }
    if (!stake.trim()) {
      setError('Please enter a stake.');
      return;
    }
    if (!creatorSide) {
      setError('Please pick your side — YES or NO.');
      return;
    }

    setSubmitting(true);
    try {
      await api('/bets', {
        method: 'POST',
        body: {
          proposition: proposition.trim(),
          stake: stake.trim(),
          creatorSide,
          userId,
        },
      });
      resetForm();
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-auto shadow-xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 text-2xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-5">Create a Bet</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Proposition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proposition
            </label>
            <textarea
              value={proposition}
              onChange={(e) => setProposition(e.target.value)}
              placeholder="e.g., Chiefs win the coin toss"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Stake */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stake
            </label>
            <input
              type="text"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              placeholder="e.g., a shot, $5, 10 pushups"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Your Side */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Side
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCreatorSide('YES')}
                className={`min-h-[52px] rounded-lg text-lg font-bold transition-colors border-2 ${
                  creatorSide === 'YES'
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                }`}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => setCreatorSide('NO')}
                className={`min-h-[52px] rounded-lg text-lg font-bold transition-colors border-2 ${
                  creatorSide === 'NO'
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-red-400'
                }`}
              >
                NO
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-600 text-sm font-medium bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-green-400 text-white font-bold text-lg rounded-lg transition-colors"
          >
            {submitting ? 'Posting...' : 'Post Bet'}
          </button>
        </form>
      </div>
    </div>
  );
}
