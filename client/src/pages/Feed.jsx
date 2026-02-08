import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../api';
import socket from '../socket';
import BetCard from '../components/BetCard';
import CreateBetModal from '../components/CreateBetModal';

const TABS = [
  { key: 'open', label: 'Open Bets' },
  { key: 'mine', label: 'My Bets' },
  { key: 'all', label: 'All Activity' },
];

export default function Feed() {
  const { user, logout } = useUser();
  const [activeTab, setActiveTab] = useState('open');
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleAcceptBet = async (betId) => {
    try {
      await api(`/bets/${betId}/accept`, {
        method: 'POST',
        body: { userId: user.id },
      });
    } catch (err) {
      console.error('Failed to accept bet:', err.message);
    }
  };

  const fetchBets = useCallback(async () => {
    setLoading(true);
    try {
      let path = '/bets';
      if (activeTab === 'open') {
        path = '/bets?status=OPEN';
      } else if (activeTab === 'mine') {
        path = `/bets?userId=${user.id}`;
      }
      const data = await api(path);
      setBets(data.bets || []);
    } catch (err) {
      console.error('Failed to fetch bets:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user?.id]);

  // Fetch bets when tab changes
  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  // Socket event handlers
  useEffect(() => {
    const handleBetEvent = (bet) => {
      setBets((prev) => {
        const idx = prev.findIndex((b) => b.id === bet.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = bet;
          return updated;
        }
        return [bet, ...prev];
      });
    };

    socket.on('bet:created', handleBetEvent);
    socket.on('bet:accepted', handleBetEvent);
    socket.on('bet:resolved', handleBetEvent);
    socket.on('bet:completed', handleBetEvent);
    socket.on('bet:cancelled', handleBetEvent);

    const handleReconnect = () => {
      fetchBets();
    };
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('bet:created', handleBetEvent);
      socket.off('bet:accepted', handleBetEvent);
      socket.off('bet:resolved', handleBetEvent);
      socket.off('bet:completed', handleBetEvent);
      socket.off('bet:cancelled', handleBetEvent);
      socket.off('connect', handleReconnect);
    };
  }, [fetchBets]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-800 text-white px-4 py-4 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">🏈 Party Bets</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-green-200">{user?.name}</span>
            <button
              onClick={logout}
              className="text-xs bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bets.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No bets yet — be the first!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bets.map((bet) => (
              <BetCard
                key={bet.id}
                bet={bet}
                currentUserId={user?.id}
                onAccept={handleAcceptBet}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-3xl font-light z-20"
        aria-label="Create new bet"
      >
        +
      </button>

      {/* Create Bet Modal */}
      {showCreateModal && (
        <CreateBetModal
          onClose={() => setShowCreateModal(false)}
          userId={user?.id}
        />
      )}
    </div>
  );
}
