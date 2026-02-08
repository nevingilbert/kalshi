import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { api } from '../api';
import socket from '../socket';

const STATUS_STYLES = {
  OPEN: 'bg-green-100 text-green-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-400',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function BetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [bet, setBet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');

  const fetchBet = useCallback(async () => {
    try {
      const data = await api(`/bets/${id}`);
      setBet(data);
    } catch (err) {
      setError(err.message || 'Failed to load bet.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBet();
  }, [fetchBet]);

  // Socket events
  useEffect(() => {
    const handleBetEvent = (updatedBet) => {
      if (updatedBet.id === id) {
        setBet(updatedBet);
      }
    };

    socket.on('bet:created', handleBetEvent);
    socket.on('bet:accepted', handleBetEvent);
    socket.on('bet:resolved', handleBetEvent);
    socket.on('bet:completed', handleBetEvent);
    socket.on('bet:cancelled', handleBetEvent);
    socket.on('connect', fetchBet);

    return () => {
      socket.off('bet:created', handleBetEvent);
      socket.off('bet:accepted', handleBetEvent);
      socket.off('bet:resolved', handleBetEvent);
      socket.off('bet:completed', handleBetEvent);
      socket.off('bet:cancelled', handleBetEvent);
      socket.off('connect', fetchBet);
    };
  }, [id, fetchBet]);

  // Clear toast after 3 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const doAction = async (path, body, successMsg) => {
    setActionLoading(true);
    setToast('');
    try {
      const updated = await api(path, { method: 'POST', body });
      setBet(updated);
      setToast(successMsg);
    } catch (err) {
      setToast(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = () =>
    doAction(`/bets/${id}/accept`, { userId: user.id }, 'Bet accepted!');

  const handleCancel = () =>
    doAction(`/bets/${id}/cancel`, { userId: user.id }, 'Bet cancelled.');

  const handleResolve = (outcome) =>
    doAction(`/bets/${id}/resolve`, { userId: user.id, outcome }, `Resolved as "${outcome}".`);

  const handleComplete = () =>
    doAction(`/bets/${id}/complete`, { userId: user.id }, 'Bet marked complete!');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !bet) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <p className="text-red-600 mb-4">{error || 'Bet not found.'}</p>
        <button
          onClick={() => navigate('/')}
          className="text-green-700 underline"
        >
          Back to Feed
        </button>
      </div>
    );
  }

  const isCreator = user?.id === bet.creator_id;
  const isAcceptor = user?.id === bet.acceptor_id;
  const isParticipant = isCreator || isAcceptor;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-800 text-white px-4 py-4 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-white hover:text-green-200 transition-colors text-lg"
            aria-label="Back to feed"
          >
            &larr;
          </button>
          <h1 className="text-lg font-bold">Bet Details</h1>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className="max-w-2xl mx-auto px-4 mt-3">
          <div className="bg-green-50 border border-green-300 text-green-800 rounded-lg px-4 py-3 text-sm shadow-sm">
            {toast}
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-md p-6 space-y-5">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                STATUS_STYLES[bet.status] || 'bg-gray-100 text-gray-600'
              }`}
            >
              {bet.status}
            </span>
            {bet.created_at && (
              <span className="text-xs text-gray-400">
                Created {formatDate(bet.created_at)}
              </span>
            )}
          </div>

          {/* Proposition */}
          <h2 className="text-xl font-bold text-gray-900 leading-snug">
            {bet.proposition}
          </h2>

          {/* Stake */}
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
            <span className="text-sm text-green-600 font-medium">Stake</span>
            <p className="text-2xl font-extrabold text-green-800">
              {bet.stake}
            </p>
          </div>

          {/* Participants */}
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm text-gray-500">Creator</p>
                <p className="font-semibold text-gray-800">
                  {bet.creator_name || 'Unknown'}
                </p>
              </div>
              <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                {bet.creator_side || 'YES'}
              </span>
            </div>

            {bet.acceptor_name && (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm text-gray-500">Acceptor</p>
                  <p className="font-semibold text-gray-800">
                    {bet.acceptor_name}
                  </p>
                </div>
                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {bet.acceptor_side || 'NO'}
                </span>
              </div>
            )}
          </div>

          {/* Winner/Loser info */}
          {(bet.status === 'RESOLVED' || bet.status === 'COMPLETED') &&
            bet.outcome && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                <p className="text-sm text-yellow-700 font-medium mb-1">
                  Outcome: <strong>{bet.outcome}</strong>
                </p>
                {bet.winner_name && (
                  <p className="text-sm text-green-700">
                    Winner: <strong>{bet.winner_name}</strong>
                  </p>
                )}
                {bet.loser_name && (
                  <p className="text-sm text-red-600">
                    Loser: <strong>{bet.loser_name}</strong>
                  </p>
                )}
              </div>
            )}

          {/* Timestamps */}
          <div className="text-xs text-gray-400 space-y-1 pt-2 border-t border-gray-100">
            {bet.created_at && <p>Created: {formatDate(bet.created_at)}</p>}
            {bet.accepted_at && <p>Accepted: {formatDate(bet.accepted_at)}</p>}
            {bet.resolved_at && <p>Resolved: {formatDate(bet.resolved_at)}</p>}
            {bet.completed_at && <p>Completed: {formatDate(bet.completed_at)}</p>}
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-3">
            {/* OPEN + not creator: Accept */}
            {bet.status === 'OPEN' && !isCreator && user && (
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {actionLoading ? 'Processing...' : 'Accept Bet'}
              </button>
            )}

            {/* OPEN + is creator: Cancel */}
            {bet.status === 'OPEN' && isCreator && (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {actionLoading ? 'Processing...' : 'Cancel Bet'}
              </button>
            )}

            {/* ACCEPTED + is participant: Resolve */}
            {bet.status === 'ACCEPTED' && isParticipant && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleResolve('YES')}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {actionLoading ? '...' : 'Yes happened'}
                </button>
                <button
                  onClick={() => handleResolve('NO')}
                  disabled={actionLoading}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {actionLoading ? '...' : 'No happened'}
                </button>
              </div>
            )}

            {/* RESOLVED + is participant: Complete */}
            {bet.status === 'RESOLVED' && isParticipant && (
              <button
                onClick={handleComplete}
                disabled={actionLoading}
                className="w-full bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {actionLoading ? 'Processing...' : 'Mark Completed'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
