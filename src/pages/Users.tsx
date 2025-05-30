import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, ArrowUpDown, Loader2, AlertCircle, Pencil, X, Save } from 'lucide-react';

interface User {
  id: string;
  username: string;
  level: number;
  stats?: {
    total_recharge: number;
    total_spent: number;
    total_comments: number;
    gold_balance: number;
    silver_balance: number;
    popularity_ticket_balance: number;
  };
  current_votes: number;
}

interface BalanceModal {
  isOpen: boolean;
  userId: string;
  balanceType: 'gold' | 'silver' | 'popularity_ticket' | 'current_votes';
  currentValue: number;
  newValue: string;
  loading: boolean;
  error: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState<'total_spent' | 'total_comments'>('total_spent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [balanceModal, setBalanceModal] = useState<BalanceModal>({
    isOpen: false,
    userId: '',
    balanceType: 'gold',
    currentValue: 0,
    newValue: '',
    loading: false,
    error: ''
  });
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm, levelFilter, sortField, sortOrder]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch user profiles with basic info
      let query = supabase
        .from('user_profiles')
        .select('id, username, level, current_votes')
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (searchTerm) {
        query = query.ilike('username', `%${searchTerm}%`);
      }

      if (levelFilter !== 'all') {
        query = query.eq('level', parseInt(levelFilter));
      }

      const { data: profilesData, error: profilesError, count } = await query;

      if (profilesError) throw profilesError;

      // Fetch user stats
      const userIds = profilesData?.map(profile => profile.id) || [];
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('user_id, total_recharge, total_spent, total_comments, gold_balance, silver_balance, popularity_ticket_balance')
        .in('user_id', userIds);

      if (statsError) throw statsError;

      // Combine the data
      const combinedData = profilesData?.map(profile => {
        const userStats = statsData?.find(s => s.user_id === profile.id);
        
        return {
          ...profile,
          stats: userStats ? {
            total_recharge: userStats.total_recharge || 0,
            total_spent: userStats.total_spent || 0,
            total_comments: userStats.total_comments || 0,
            gold_balance: userStats.gold_balance || 0,
            silver_balance: userStats.silver_balance || 0,
            popularity_ticket_balance: userStats.popularity_ticket_balance || 0
          } : {
            total_recharge: 0,
            total_spent: 0,
            total_comments: 0,
            gold_balance: 0,
            silver_balance: 0,
            popularity_ticket_balance: 0
          }
        };
      }) || [];

      // Sort the combined data
      const sortedData = [...combinedData].sort((a, b) => {
        const aValue = a.stats?.[sortField] || 0;
        const bValue = b.stats?.[sortField] || 0;
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });

      setUsers(sortedData);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleEditBalance = (userId: string, balanceType: 'gold' | 'silver' | 'popularity_ticket' | 'current_votes', currentValue: number) => {
    setBalanceModal({
      isOpen: true,
      userId,
      balanceType,
      currentValue,
      newValue: currentValue.toString(),
      loading: false,
      error: ''
    });
  };

  const handleSaveBalance = async () => {
    try {
      setBalanceModal(prev => ({ ...prev, loading: true, error: '' }));
      
      const newValue = parseInt(balanceModal.newValue);
      if (isNaN(newValue) || newValue < 0) {
        throw new Error('Please enter a valid non-negative number');
      }
      
      if (balanceModal.balanceType === 'current_votes') {
        // Update current_votes in user_profiles table
        const { error } = await supabase
          .from('user_profiles')
          .update({ current_votes: newValue })
          .eq('id', balanceModal.userId);
          
        if (error) throw error;
      } else {
        // Call RPC function to update balance in user_stats table
        const { data, error } = await supabase.rpc('update_user_balance', {
          p_user_id: balanceModal.userId,
          p_balance_type: balanceModal.balanceType,
          p_new_value: newValue
        });
        
        if (error) throw error;
        if (!data) throw new Error('Failed to update balance');
      }
      
      // Update the user in the local state
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.id === balanceModal.userId) {
            if (balanceModal.balanceType === 'current_votes') {
              return {
                ...user,
                current_votes: newValue
              };
            } else {
              return {
                ...user,
                stats: {
                  ...user.stats!,
                  [`${balanceModal.balanceType}_balance`]: newValue
                }
              };
            }
          }
          return user;
        })
      );
      
      // Close the modal
      setBalanceModal(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      console.error('Error updating balance:', error);
      setBalanceModal(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to update balance' 
      }));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <p className="text-gray-600 dark:text-gray-400 text-xs">管理系统中的所有用户</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="搜索用户名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 text-xs"
            />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 text-xs"
            >
              <option value="all">全部等级</option>
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={i + 1}>等级 {i + 1}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4 text-xs">用户名</th>
                <th className="text-left py-3 px-4 text-xs">等级</th>
                <th className="text-left py-3 px-4 text-xs">总充值金币</th>
                <th className="text-left py-3 px-4 cursor-pointer text-xs" onClick={() => toggleSort('total_spent')}>
                  <div className="flex items-center">
                    总消费金币
                    <ArrowUpDown className={`ml-1 h-4 w-4 ${sortField === 'total_spent' ? 'text-primary-500' : ''}`} />
                  </div>
                </th>
                <th className="text-left py-3 px-4 cursor-pointer text-xs" onClick={() => toggleSort('total_comments')}>
                  <div className="flex items-center">
                    评论数
                    <ArrowUpDown className={`ml-1 h-4 w-4 ${sortField === 'total_comments' ? 'text-primary-500' : ''}`} />
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-xs">金币余额</th>
                <th className="text-left py-3 px-4 text-xs">银币余额</th>
                <th className="text-left py-3 px-4 text-xs">人气票余额</th>
                <th className="text-left py-3 px-4 text-xs">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-xs">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-xs">暂无数据</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b dark:border-gray-700">
                    <td className="py-3 px-4 text-xs">{user.username}</td>
                    <td className="py-3 px-4 text-xs">Lv.{user.level}</td>
                    <td className="py-3 px-4 text-xs">{user.stats?.total_recharge || 0}</td>
                    <td className="py-3 px-4 text-xs">{user.stats?.total_spent || 0}</td>
                    <td className="py-3 px-4 text-xs">{user.stats?.total_comments || 0}</td>
                    <td className="py-3 px-4 text-xs cursor-pointer hover:text-primary-600" 
                        onClick={() => handleEditBalance(user.id, 'gold', user.stats?.gold_balance || 0)}>
                      {user.stats?.gold_balance || 0}
                      <Pencil className="h-3 w-3 inline ml-1" />
                    </td>
                    <td className="py-3 px-4 text-xs cursor-pointer hover:text-primary-600"
                        onClick={() => handleEditBalance(user.id, 'silver', user.stats?.silver_balance || 0)}>
                      {user.stats?.silver_balance || 0}
                      <Pencil className="h-3 w-3 inline ml-1" />
                    </td>
                    <td className="py-3 px-4 text-xs cursor-pointer hover:text-primary-600"
                        onClick={() => handleEditBalance(user.id, 'current_votes', user.current_votes || 0)}>
                      {user.current_votes || 0}
                      <Pencil className="h-3 w-3 inline ml-1" />
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <button
                        onClick={() => {/* TODO: Implement user details view */}}
                        className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                        title="查看详情"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400 text-xs">
            共 {users.length} 条记录
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50 text-xs"
            >
              上一页
            </button>
            <span className="px-3 py-1 text-xs">
              第 {currentPage} 页，共 {totalPages} 页
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50 text-xs"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {/* Balance Edit Modal */}
      {balanceModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                修改{balanceModal.balanceType === 'gold' ? '金币' : 
                     balanceModal.balanceType === 'silver' ? '银币' : '人气票'}余额
              </h3>
              <button
                onClick={() => setBalanceModal(prev => ({ ...prev, isOpen: false }))}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {balanceModal.error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center text-xs">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{balanceModal.error}</span>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-xs">当前余额</label>
              <div className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-xs">
                {balanceModal.currentValue}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-xs">新余额</label>
              <input
                type="number"
                min="0"
                value={balanceModal.newValue}
                onChange={(e) => setBalanceModal(prev => ({ ...prev, newValue: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 text-xs"
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setBalanceModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-xs"
              >
                取消
              </button>
              <button
                onClick={handleSaveBalance}
                disabled={balanceModal.loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center text-xs"
              >
                {balanceModal.loading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-2" />
                    保存
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;