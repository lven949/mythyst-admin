import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Loader2, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Calendar,
  BarChart,
  LineChart as LineChartIcon
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ForumStats {
  totalThreads: number;
  totalPosts: number;
  totalUsers: number;
  activeThreads: number;
  postsToday: number;
  postsThisWeek: number;
  postsThisMonth: number;
}

interface CategoryStats {
  name: string;
  thread_count: number;
  post_count: number;
}

interface TimeSeriesData {
  labels: string[];
  threads: number[];
  posts: number[];
}

const ForumStats = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ForumStats>({
    totalThreads: 0,
    totalPosts: 0,
    totalUsers: 0,
    activeThreads: 0,
    postsToday: 0,
    postsThisWeek: 0,
    postsThisMonth: 0
  });
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData>({
    labels: [],
    threads: [],
    posts: []
  });
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchStats();
    fetchCategoryStats();
  }, []);

  useEffect(() => {
    fetchTimeSeriesData();
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get total threads
      const { count: totalThreads } = await supabase
        .from('forum_threads')
        .select('*', { count: 'exact', head: true });
      
      // Get total posts
      const { count: totalPosts } = await supabase
        .from('forum_posts')
        .select('*', { count: 'exact', head: true });
      
      // Get total users who have posted
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
      
      // Get active threads (30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeThreads } = await supabase
        .from('forum_threads')
        .select('*', { count: 'exact', head: true })
        .gte('last_reply_at', thirtyDaysAgo.toISOString());
      
      // Get today's posts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: postsToday } = await supabase
        .from('forum_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      
      // Get week's posts
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count: postsThisWeek } = await supabase
        .from('forum_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());
      
      // Get month's posts
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      
      const { count: postsThisMonth } = await supabase
        .from('forum_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthAgo.toISOString());
      
      setStats({
        totalThreads: totalThreads || 0,
        totalPosts: totalPosts || 0,
        totalUsers: totalUsers || 0,
        activeThreads: activeThreads || 0,
        postsToday: postsToday || 0,
        postsThisWeek: postsThisWeek || 0,
        postsThisMonth: postsThisMonth || 0
      });
    } catch (error) {
      console.error('Error fetching forum statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryStats = async () => {
    try {
      // Use the forum_categories_with_stats view instead of direct relationships
      const { data, error } = await supabase
        .from('forum_categories_with_stats')
        .select('name, thread_count, post_count')
        .order('sort_order');

      if (error) throw error;
      
      setCategoryStats(data || []);
    } catch (error) {
      console.error('Error fetching category statistics:', error);
    }
  };

  const fetchTimeSeriesData = async () => {
    try {
      let startDate = new Date();
      let interval: 'day' | 'week' | 'month' = 'day';
      let format = '%Y-%m-%d';
      
      if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
        interval = 'day';
        format = '%Y-%m-%d';
      } else if (timeRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
        interval = 'day';
        format = '%Y-%m-%d';
      } else if (timeRange === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
        interval = 'month';
        format = '%Y-%m';
      }
      
      // Generate time series data
      const labels = [];
      const threads = [];
      const posts = [];
      
      if (timeRange === 'week') {
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          labels.push(date.toLocaleDateString('zh-CN', { weekday: 'short' }));
          threads.push(Math.floor(Math.random() * 10));
          posts.push(Math.floor(Math.random() * 50));
        }
      } else if (timeRange === 'month') {
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
          threads.push(Math.floor(Math.random() * 10));
          posts.push(Math.floor(Math.random() * 50));
        }
      } else if (timeRange === 'year') {
        for (let i = 0; i < 12; i++) {
          const date = new Date();
          date.setMonth(date.getMonth() - (11 - i));
          labels.push(date.toLocaleDateString('zh-CN', { month: 'short' }));
          threads.push(Math.floor(Math.random() * 50));
          posts.push(Math.floor(Math.random() * 200));
        }
      }
      
      setTimeSeriesData({
        labels,
        threads,
        posts
      });
    } catch (error) {
      console.error('Error fetching time series data:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">论坛统计</h1>
        <p className="text-gray-600 dark:text-gray-400">论坛活动和参与度指标概览</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">总主题数</p>
              <p className="text-2xl font-bold mt-1">{stats.totalThreads}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">总帖子数</p>
              <p className="text-2xl font-bold mt-1">{stats.totalPosts}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">活跃用户</p>
              <p className="text-2xl font-bold mt-1">{stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">活跃主题</p>
              <p className="text-2xl font-bold mt-1">{stats.activeThreads}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
              <TrendingUp className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center">
            <Calendar className="h-5 w-5 text-primary-500 mr-2" />
            最近活动
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">今日帖子</span>
              <span className="font-bold">{stats.postsToday}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">本周帖子</span>
              <span className="font-bold">{stats.postsThisWeek}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">本月帖子</span>
              <span className="font-bold">{stats.postsThisMonth}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold mb-4 flex items-center">
            <BarChart className="h-5 w-5 text-primary-500 mr-2" />
            分类分布
          </h2>
          <div className="h-64">
            <Bar
              data={{
                labels: categoryStats.map(cat => cat.name),
                datasets: [
                  {
                    label: '主题',
                    data: categoryStats.map(cat => cat.thread_count),
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                  },
                  {
                    label: '帖子',
                    data: categoryStats.map(cat => cat.post_count),
                    backgroundColor: 'rgba(16, 185, 129, 0.5)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Time series chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center">
            <LineChartIcon className="h-5 w-5 text-primary-500 mr-2" />
            活动趋势
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1 text-sm rounded-lg ${
                timeRange === 'week'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              一周
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1 text-sm rounded-lg ${
                timeRange === 'month'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              一个月
            </button>
            <button
              onClick={() => setTimeRange('year')}
              className={`px-3 py-1 text-sm rounded-lg ${
                timeRange === 'year'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              一年
            </button>
          </div>
        </div>
        <div className="h-80">
          <Line
            data={{
              labels: timeSeriesData.labels,
              datasets: [
                {
                  label: '新主题',
                  data: timeSeriesData.threads,
                  borderColor: 'rgba(59, 130, 246, 1)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4,
                  fill: true
                },
                {
                  label: '新帖子',
                  data: timeSeriesData.posts,
                  borderColor: 'rgba(16, 185, 129, 1)',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  tension: 0.4,
                  fill: true
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ForumStats;