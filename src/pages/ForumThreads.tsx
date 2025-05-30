import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  Filter, 
  Loader2, 
  Star, 
  Pin, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  MessageSquare,
  Eye,
  Calendar,
  User,
  X
} from 'lucide-react';

interface Thread {
  id: string;
  title: string;
  created_at: string;
  is_pinned: boolean;
  is_featured: boolean;
  is_active: boolean;
  view_count: number;
  reply_count: number;
  category: {
    name: string;
  };
  author: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

const ForumThreads = () => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const threadsPerPage = 20;

  useEffect(() => {
    fetchThreads();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchThreads = async () => {
    try {
      setLoading(true);

      // 获取总数用于分页
      let countQuery = supabase
        .from('forum_threads')
        .select('id', { count: 'exact', head: true });

      if (searchTerm) {
        countQuery = countQuery.ilike('title', `%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        countQuery = countQuery.eq('is_active', statusFilter === 'active');
      }

      const { count, error: countError } = await countQuery;
      
      if (countError) throw countError;
      
      setTotalPages(Math.ceil((count || 0) / threadsPerPage));

      // 获取主题列表
      let query = supabase
        .from('forum_threads')
        .select(`
          id,
          title,
          created_at,
          is_pinned,
          is_featured,
          is_active,
          view_count,
          reply_count:forum_posts!fk_forum_posts_thread(count),
          category:forum_categories!forum_threads_category_id_fkey(
            name
          ),
          author:user_profiles!forum_threads_author_id_fkey(
            id,
            username,
            avatar_url
          )
        `)
        .range((currentPage - 1) * threadsPerPage, currentPage * threadsPerPage - 1);

      if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('is_active', statusFilter === 'active');
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      
      // 转换数据以包含回复数
      const transformedThreads = data?.map(thread => ({
        ...thread,
        reply_count: thread.reply_count?.length || 0
      })) || [];
      
      setThreads(transformedThreads);
    } catch (error) {
      console.error('获取主题失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('forum_threads')
        .update({ is_pinned: !isPinned })
        .eq('id', id);

      if (error) throw error;
      fetchThreads();
    } catch (error) {
      console.error('切换置顶状态失败:', error);
    }
  };

  const handleToggleFeatured = async (id: string, isFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('forum_threads')
        .update({ is_featured: !isFeatured })
        .eq('id', id);

      if (error) throw error;
      fetchThreads();
    } catch (error) {
      console.error('切换精选状态失败:', error);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('forum_threads')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      fetchThreads();
    } catch (error) {
      console.error('切换活跃状态失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // 先删除该主题下的所有帖子
      const { error: postsError } = await supabase
        .from('forum_posts')
        .delete()
        .eq('thread_id', id);

      if (postsError) throw postsError;

      // 然后删除主题
      const { error: threadError } = await supabase
        .from('forum_threads')
        .delete()
        .eq('id', id);

      if (threadError) throw threadError;

      setDeleteConfirm(null);
      fetchThreads();
    } catch (error) {
      console.error('删除主题失败:', error);
      alert('删除主题失败');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">论坛主题管理</h1>
        <p className="text-gray-600 dark:text-gray-400">管理论坛主题、置顶重要讨论和审核内容</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索主题..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">所有主题</option>
              <option value="active">仅活跃</option>
              <option value="inactive">仅禁用</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4">标题</th>
                  <th className="text-left py-3 px-4">分类</th>
                  <th className="text-left py-3 px-4">作者</th>
                  <th className="text-left py-3 px-4">创建时间</th>
                  <th className="text-center py-3 px-4">统计</th>
                  <th className="text-center py-3 px-4">状态</th>
                  <th className="text-left py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {threads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      没有找到主题
                    </td>
                  </tr>
                ) : (
                  threads.map((thread) => (
                    <tr key={thread.id} className="border-b dark:border-gray-700">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <MessageSquare className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <div className="font-medium">{thread.title}</div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {thread.is_pinned && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                  <Pin className="h-3 w-3 mr-1" />
                                  置顶
                                </span>
                              )}
                              {thread.is_featured && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                  <Star className="h-3 w-3 mr-1" />
                                  精选
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{thread.category.name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-1" />
                          {thread.author.username}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                          {new Date(thread.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-4">
                          <div className="flex items-center">
                            <MessageSquare className="h-4 w-4 text-gray-400 mr-1" />
                            <span>{thread.reply_count}</span>
                          </div>
                          <div className="flex items-center">
                            <Eye className="h-4 w-4 text-gray-400 mr-1" />
                            <span>{thread.view_count}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            thread.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {thread.is_active ? '活跃' : '禁用'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleTogglePin(thread.id, thread.is_pinned)}
                            className={`p-1 rounded ${
                              thread.is_pinned
                                ? 'text-blue-600 hover:bg-blue-50'
                                : 'text-gray-400 hover:bg-gray-50'
                            }`}
                            title={thread.is_pinned ? '取消置顶' : '置顶'}
                          >
                            <Pin className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleFeatured(thread.id, thread.is_featured)}
                            className={`p-1 rounded ${
                              thread.is_featured
                                ? 'text-yellow-600 hover:bg-yellow-50'
                                : 'text-gray-400 hover:bg-gray-50'
                            }`}
                            title={thread.is_featured ? '取消精选' : '设为精选'}
                          >
                            <Star className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(thread.id, thread.is_active)}
                            className={`p-1 rounded ${
                              thread.is_active
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-red-600 hover:bg-red-50'
                            }`}
                            title={thread.is_active ? '禁用' : '启用'}
                          >
                            {thread.is_active ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(thread.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              第 {currentPage} 页，共 {totalPages} 页
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                删除主题
              </h2>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              确定要删除这个主题吗？这将永久删除该主题及其所有帖子。此操作无法撤销。
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumThreads;
