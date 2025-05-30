import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Book,
  Users,
  Coins,
} from 'lucide-react';

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

const Dashboard = () => {
  const [metrics, setMetrics] = useState({
    totalBooks: 0,
    totalUsers: 0,
    totalCoins: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      // Fetch metrics
      const [
        { count: booksCount },
        { data: usersData },
        { data: coinsData },
      ] = await Promise.all([
        supabase.from('books').select('*', { count: 'exact' }),
        supabase.rpc('get_total_users'),
        supabase.from('coin_transactions')
          .select('amount')
          .in('type', ['recharge', 'unlock'])
      ]);

      // Calculate total coins by summing amounts client-side
      const totalCoins = coinsData?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0;

      setMetrics({
        totalBooks: booksCount || 0,
        totalUsers: usersData?.count || 0,
        totalCoins: totalCoins,
      });
    };

    fetchData();
  }, []);

  const metricCards = [
    { title: '总小说数', value: metrics.totalBooks, icon: Book },
    { title: '注册用户数', value: metrics.totalUsers, icon: Users },
    { title: '金币流水总额', value: metrics.totalCoins, icon: Coins },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">管理仪表盘</h1>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-center">
                <div className="p-3 bg-primary-50 dark:bg-primary-900 rounded-xl">
                  <Icon className="h-6 w-6 text-primary-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {formatNumber(card.value)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">金币统计</h2>
          <div className="h-64 flex items-center justify-center text-gray-500">
            金币统计数据将在这里显示
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
