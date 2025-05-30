import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  AlertTriangle,
  Users,
  Coins,
  Settings as SettingsIcon,
  LineChart,
  MessageSquare,
  TrendingUp,
  Bell,
  DollarSign,
  Wallet,
  Grid,
  Tag,
  CheckSquare,
  MessageCircle,
  Image
} from 'lucide-react';

const menuItems = [
  { path: '/', label: '管理仪表盘', icon: LayoutDashboard },
  { path: '/traffic-stats', label: '流量统计', icon: TrendingUp },
  { path: '/notifications', label: '站内通知', icon: Bell },
  { divider: true },
  { path: '/books', label: '小说管理', icon: BookOpen },
  { path: '/genres', label: '小说分类管理', icon: Grid },
  { path: '/tags', label: '小说标签管理', icon: Tag },
  { path: '/short-story-tags', label: '短篇故事标签管理', icon: Tag },
  { path: '/chapters', label: '章节管理', icon: FileText },
  { path: '/homepage-banners', label: '首页轮播图', icon: Image },
  { path: '/reports', label: '举报管理', icon: AlertTriangle },
  { path: '/users', label: '用户管理', icon: Users },
  { path: '/coins',label: '金币流水', icon: Coins },
  { path: '/coin-settings', label: '充值设置', icon: SettingsIcon },
  { path: '/comments', label: '评论管理', icon: MessageSquare },
  { divider: true },
  { path: '/forum/categories', label: '论坛板块管理', icon: Grid },
  { path: '/forum/threads', label: '论坛话题管理', icon: MessageCircle },
  { path: '/forum/reports', label: '论坛举报处理', icon: AlertTriangle },
  { path: '/forum/stats', label: '论坛数据统计', icon: TrendingUp },
  { divider: true },
  { path: '/platform-settings', label: '平台设置', icon: DollarSign },
  { path: '/withdraw-review', label: '提现审核', icon: Wallet },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Redirect to login if not authenticated
        window.location.href = '/login';
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        // Redirect to home if not admin
        window.location.href = '/';
        return;
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      window.location.href = '/login';
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-sm overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold">Novel Admin</h1>
        </div>
        <nav className="mt-5 px-2">
          <div className="space-y-1">
            {menuItems.map((item, index) => {
              if (item.divider) {
                return <hr key={`divider-${index}`} className="my-4 border-gray-200 dark:border-gray-700" />;
              }

              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 dark:bg-primary-900 dark:text-primary-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-500' : 'text-gray-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;