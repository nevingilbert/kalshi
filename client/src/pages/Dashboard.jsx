import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import socket from '../socket';
import StatsBar from '../components/StatsBar';
import OpenBetsTicker from '../components/OpenBetsTicker';
import ActivityFeed from '../components/ActivityFeed';
import Leaderboard from '../components/Leaderboard';

export default function Dashboard() {
  const [bets, setBets] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState({
    open_bets: 0,
    active_bets: 0,
    resolved_bets: 0,
    total_users: 0,
  });

  // Derived data
  const openBets = bets.filter((b) => b.status === 'OPEN');

  // Sort bets by most recent activity for the activity feed
  const activityBets = [...bets]
    .filter((b) => b.status !== 'CANCELLED')
    .sort((a, b) => {
      const timeA = a.completed_at || a.resolved_at || a.accepted_at || a.created_at;
      const timeB = b.completed_at || b.resolved_at || b.accepted_at || b.created_at;
      return new Date(timeB) - new Date(timeA);
    });

  // Recompute stats from bets
  const recomputeStats = useCallback((currentBets) => {
    setStats((prev) => ({
      ...prev,
      open_bets: currentBets.filter((b) => b.status === 'OPEN').length,
      active_bets: currentBets.filter((b) => b.status === 'ACCEPTED').length,
      resolved_bets: currentBets.filter(
        (b) => b.status === 'RESOLVED' || b.status === 'COMPLETED'
      ).length,
    }));
  }, []);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [betsData, leaderboardData] = await Promise.all([
          api('/bets'),
          api('/bets/leaderboard/data'),
        ]);

        const betsArr = betsData.bets || [];
        setBets(betsArr);
        recomputeStats(betsArr);

        if (leaderboardData.leaderboard) {
          setLeaderboard(leaderboardData.leaderboard);
        }
      } catch (err) {
        console.error('Dashboard: failed to fetch initial data', err);
      }
    };

    fetchData();
  }, [recomputeStats]);

  // Socket event handlers
  useEffect(() => {
    const handleBetCreated = (bet) => {
      setBets((prev) => {
        const updated = [bet, ...prev.filter((b) => b.id !== bet.id)];
        recomputeStats(updated);
        return updated;
      });
    };

    const handleBetUpdated = (bet) => {
      setBets((prev) => {
        const updated = prev.map((b) => (b.id === bet.id ? bet : b));
        recomputeStats(updated);
        return updated;
      });
    };

    const handleStatsUpdated = (newStats) => {
      setStats((prev) => ({ ...prev, ...newStats }));
    };

    const handleLeaderboardUpdate = () => {
      api('/bets/leaderboard/data')
        .then((data) => {
          if (data.leaderboard) setLeaderboard(data.leaderboard);
        })
        .catch(() => {});
    };

    socket.on('bet:created', handleBetCreated);
    socket.on('bet:accepted', handleBetUpdated);
    socket.on('bet:resolved', (bet) => {
      handleBetUpdated(bet);
      handleLeaderboardUpdate();
    });
    socket.on('bet:completed', (bet) => {
      handleBetUpdated(bet);
      handleLeaderboardUpdate();
    });
    socket.on('bet:cancelled', handleBetUpdated);
    socket.on('stats:updated', handleStatsUpdated);

    return () => {
      socket.off('bet:created', handleBetCreated);
      socket.off('bet:accepted', handleBetUpdated);
      socket.off('bet:resolved');
      socket.off('bet:completed');
      socket.off('bet:cancelled', handleBetUpdated);
      socket.off('stats:updated', handleStatsUpdated);
    };
  }, [recomputeStats]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col">
      {/* Title */}
      <h1 className="text-4xl lg:text-5xl font-extrabold text-center tracking-tight mb-6 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
        SUPER BOWL PARTY BETS
      </h1>

      {/* Stats Bar */}
      <div className="mb-6">
        <StatsBar stats={stats} />
      </div>

      {/* Main content area */}
      <div className="flex-1 grid grid-cols-5 gap-6 min-h-0">
        {/* Left column — 60% (3 of 5 cols) */}
        <div className="col-span-3 flex flex-col gap-6 min-h-0">
          <OpenBetsTicker bets={openBets} />
          <div className="flex-1 min-h-0 overflow-hidden">
            <ActivityFeed bets={activityBets} />
          </div>
        </div>

        {/* Right column — 40% (2 of 5 cols) */}
        <div className="col-span-2 min-h-0">
          <Leaderboard data={leaderboard} />
        </div>
      </div>
    </div>
  );
}
