import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import socket from '../socket';

const STATUS_STYLES = {
  OPEN: 'bg-green-100 text-green-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-400',
};

export default function Admin() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchBets = useCallback(async () => {
    try {
      const data = await api('/bets');
      setBets(data.bets || []);
    } catch (err) {
      console.error('Failed to fetch bets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  useEffect(() => {
    const handler = () => fetchBets();
    socket.on('bet:created', handler);
    socket.on('bet:accepted', handler);
    socket.on('bet:resolved', handler);
    socket.on('bet:completed', handler);
    socket.on('bet:cancelled', handler);
    return () => {
      socket.off('bet:created', handler);
      socket.off('bet:accepted', handler);
      socket.off('bet:resolved', handler);
      socket.off('bet:completed', handler);
      socket.off('bet:cancelled', handler);
    };
  }, [fetchBets]);

  useEffect(() => {
    if (!actionMsg) return;
    const t = setTimeout(() => setActionMsg(''), 3000);
    return () => clearTimeout(t);
  }, [actionMsg]);

  const handleDelete = async (betId) => {
    try {
      await api(`/bets/${betId}/admin-delete`, { method: 'DELETE' });
      setBets((prev) => prev.filter((b) => b.id !== betId));
      setActionMsg('Bet deleted.');
    } catch (err) {
      setActionMsg(err.message || 'Delete failed.');
    }
  };

  const handleUndoAccept = async (betId) => {
    try {
      const updated = await api(`/bets/${betId}/admin-undo-accept`, { method: 'POST' });
      setBets((prev) => prev.map((b) => (b.id === betId ? updated : b)));
      setActionMsg('Accept undone — bet is open again.');
    } catch (err) {
      setActionMsg(err.message || 'Undo failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-red-800 px-4 py-4 shadow-md">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-red-200 text-sm">Manage bets — delete or undo accepts</p>
        </div>
      </header>

      {actionMsg && (
        <div className="max-w-4xl mx-auto px-4 mt-3">
          <div className="bg-yellow-900 border border-yellow-700 text-yellow-200 rounded-lg px-4 py-3 text-sm">
            {actionMsg}
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bets.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No bets to manage.</p>
        ) : (
          <div className="space-y-3">
            {bets.map((bet) => (
              <div
                key={bet.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{bet.proposition}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Stake: <span className="text-purple-300 font-semibold">{bet.stake}</span>
                      {' — '}
                      {bet.creator_name} ({bet.creator_side})
                      {bet.acceptor_name && ` vs ${bet.acceptor_name}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      STATUS_STYLES[bet.status] || ''
                    }`}
                  >
                    {bet.status}
                  </span>
                </div>

                <div className="flex gap-2">
                  {bet.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleUndoAccept(bet.id)}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Undo Accept
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(bet.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Delete Bet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
