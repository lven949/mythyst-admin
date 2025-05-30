import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  CreditCard, 
  Clock, 
  ArrowUpDown, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  DollarSign, 
  BookOpen, 
  Gift
} from 'lucide-react';

interface NotificationForm {
  title: string;
  content: string;
  type: 'system' | 'review' | 'alert';
  user_id?: string;
}

const AdminNotifications = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<NotificationForm>({
    title: '',
    content: '',
    type: 'system'
  });
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string }>>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string } | null>(null);

  const handleUserSearch = async (query: string) => {
    setUserSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username')
        .ilike('username', `%${query}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleSelectUser = (user: { id: string; username: string }) => {
    setSelectedUser(user);
    setFormData(prev => ({ ...prev, user_id: user.id }));
    setSearchResults([]);
    setUserSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.title.trim()) {
        setError('请输入通知标题');
        return;
      }

      if (!formData.content.trim()) {
        setError('请输入通知内容');
        return;
      }

      const { error: insertError } = await supabase
        .from('site_notifications')
        .insert([{
          ...formData,
          is_read: false,
          created_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      setFormData({
        title: '',
        content: '',
        type: 'system'
      });
      setSelectedUser(null);
      alert('通知发送成功！');
    } catch (error) {
      console.error('Error sending notification:', error);
      setError('发送通知失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        
        <h1 className="text-2xl font-bold mb-6">发送站内通知</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">通知标题 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">通知内容 *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">通知类型 *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'system' | 'review' | 'alert' })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
              required
            >
              <option value="system">系统通知</option>
              <option value="review">审核通知</option>
              <option value="alert">警告通知</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              接收用户（可选 - 留空则发送全站通知）
            </label>
            <div className="relative">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="搜索用户名..."
                className="w-full px-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
              />
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              {selectedUser && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setFormData(prev => ({ ...prev, user_id: undefined }));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <AlertCircle className="h-5 w-5 text-gray-400 hover:text-red-500" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && !selectedUser && (
              <div className="absolute mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 max-h-48 overflow-y-auto z-10">
                {searchResults.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {user.username}
                  </button>
                ))}
              </div>
            )}

            {selectedUser && (
              <div className="mt-2 px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg inline-block">
                已选择用户: {selectedUser.username}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? '发送中...' : '发送通知'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default AdminNotifications;