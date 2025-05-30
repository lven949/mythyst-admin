import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { Users, TrendingUp, AlertCircle } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface DailyStats {
  date: string;
  visits: number;
  unique_users: number;
}

const AdminTrafficStats = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchStats();
    }
  }, [timeRange]);

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        navigate('/');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setError('无法验证管理员权限');
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');

      // 计算日期范围
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (timeRange === '7d' ? 7 : 30));

      // 获取指定时间段内的登录日志
      const { data: loginLogs, error: logsError } = await supabase
        .from('user_login_logs')
        .select('logged_in_at, user_id')
        .gte('logged_in_at', startDate.toISOString())
        .lte('logged_in_at', endDate.toISOString());

      if (logsError) throw logsError;

      // 处理日志数据为每日统计
      const dailyStats = new Map<string, { visits: number; users: Set<string> }>();
      
      // 初始化日期范围内的所有日期
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dailyStats.set(dateStr, { visits: 0, users: new Set() });
      }

      // 聚合登录数据
      loginLogs?.forEach(log => {
        const dateStr = new Date(log.logged_in_at).toISOString().split('T')[0];
        const dayStats = dailyStats.get(dateStr);
        if (dayStats) {
          dayStats.visits++;
          dayStats.users.add(log.user_id);
        }
      });

      // 转换为数组格式
      const processedStats = Array.from(dailyStats.entries()).map(([date, stats]) => ({
        date,
        visits: stats.visits,
        unique_users: stats.users.size
      })).sort((a, b) => a.date.localeCompare(b.date));

      setStats(processedStats);
    } catch (error) {
      console.error('Error fetching traffic stats:', error);
      setError('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: stats.map(stat => new Date(stat.date).toLocaleDateString('zh-CN')),
    datasets: [
      {
        label: '总访问量',
        data: stats.map(stat => stat.visits),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: '独立用户数',
        data: stats.map(stat => stat.unique_users),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-gray-500">加载统计数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">流量统计</h1>
        <p className="text-gray-600 dark:text-gray-400">监控网站流量和用户参与度</p>
      </div>

      {/* 时间范围选择器 */}
      <div className="mb-6">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700">
          <button
            className={`px-4 py-2 rounded-l-lg ${
              timeRange === '7d'
                ? 'bg-primary-500 text-white'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={() => setTimeRange('7d')}
          >
            最近7天
          </button>
          <button
            className={`px-4 py-2 rounded-r-lg ${
              timeRange === '30d'
                ? 'bg-primary-500 text-white'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={() => setTimeRange('30d')}
          >
            最近30天
          </button>
        </div>
      </div>

      {/* 统计摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">总访问量</h2>
            <TrendingUp className="h-6 w-6 text-primary-500" />
          </div>
          <p className="text-3xl font-bold">
            {stats.reduce((sum, stat) => sum + stat.visits, 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">独立用户数</h2>
            <Users className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-3xl font-bold">
            {stats.reduce((sum, stat) => sum + stat.unique_users, 0)}
          </p>
        </div>
      </div>

      {/* 流量趋势图表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">流量趋势</h2>
        <div className="h-[400px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* 无数据提示 */}
      {stats.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center mt-6">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            所选时间范围内没有流量数据
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminTrafficStats;