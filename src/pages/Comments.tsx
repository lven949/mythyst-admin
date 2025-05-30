import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  MessageSquare, 
  Trash2, 
  CheckCircle, 
  X, 
  AlertTriangle, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Loader2,
  User,
  Calendar,
  Eye,
  Flag
} from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
  book: {
    id: string;
    title: string;
  };
  chapter?: {
    id: string;
    title: string;
  };
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

const AdminComments = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'book' | 'chapter'>('all');
  const [sortField, setSortField] = useState<'created_at' | 'likes'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const commentsPerPage = 10;

  useEffect(() => {
    fetchComments();
  }, [currentPage, searchTerm, typeFilter, sortField, sortOrder]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      
      // 获取总评论数用于分页
      let countQuery = supabase
        .from('book_comments')
        .select('id', { count: 'exact', head: true });

      if (searchTerm) {
        countQuery = countQuery.ilike('content', `%${searchTerm}%`);
      }

      if (typeFilter !== 'all') {
        if (typeFilter === 'book') {
          countQuery = countQuery.is('chapter_id', null);
        } else {
          countQuery = countQuery.not('chapter_id', 'is', null);
        }
      }

      const { count, error: countError } = await countQuery;
      
      if (countError) throw countError;
      
      setTotalPages(Math.ceil((count || 0) / commentsPerPage));

      // 获取评论数据
      let query = supabase
        .from('book_comments')
        .select(`
          id,
          content,
          created_at,
          is_pinned,
          book:books!book_comments_book_id_fkey!inner(
            id,
            title
          ),
          chapter:chapters(
            id,
            title
          ),
          user:user_profiles!inner(
            id,
            username,
            avatar_url
          )
        `)
        .range((currentPage - 1) * commentsPerPage, currentPage * commentsPerPage - 1);

      if (searchTerm) {
        query = query.ilike('content', `%${searchTerm}%`);
      }

      if (typeFilter !== 'all') {
        if (typeFilter === 'book') {
          query = query.is('chapter_id', null);
        } else {
          query = query.not('chapter_id', 'is', null);
        }
      }

      // 应用排序
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('获取评论失败:', error);
      setError('获取评论数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('book_comments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setShowDeleteConfirm(null);
      setComments(comments.filter(comment => comment.id !== id));
      
      // 如果当前页面没有评论了，返回上一页
      if (comments.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchComments();
      }
    } catch (error) {
      console.error('删除评论失败:', error);
      setError('删除评论失败');
    }
  };

  const toggleSort = (field: 'created_at' | 'likes') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatCommentContent = (content: string) => {
    // 截断过长的评论内容
    if (content.length > 100) {
      return content.substring(0, 100) + '...';
    }
    return content;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">评论管理</h1>
        <p className="text-gray-600 dark:text-gray-400">管理用户在小说和章节下的评论</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {/* 搜索和筛选 */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索评论内容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'book' | 'chapter')}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">所有评论</option>
              <option value="book">小说评论</option>
              <option value="chapter">章节评论</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {/* 评论列表 */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400">暂无评论数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4">用户</th>
                  <th className="text-left py-3 px-4">评论内容</th>
                  <th className="text-left py-3 px-4">所属内容</th>
                  <th className="text-left py-3 px-4 cursor-pointer" onClick={() => toggleSort('created_at')}>
                    <div className="flex items-center">
                      发布时间
                      <ArrowUpDown className={`ml-1 h-4 w-4 ${sortField === 'created_at' ? 'text-primary-500' : ''}`} />
                    </div>
                  </th>
                  <th className="text-left py-3 px-4">状态</th>
                  <th className="text-left py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((comment) => (
                  <tr key={comment.id} className="border-b dark:border-gray-700">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        {comment.user.avatar_url ? (
                          <img
                            src={comment.user.avatar_url}
                            alt={comment.user.username}
                            className="w-8 h-8 rounded-full mr-2"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mr-2">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                        <span>{comment.user.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs truncate">
                        {formatCommentContent(comment.content)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {comment.chapter ? (
                        <div>
                          <div className="text-sm font-medium">{comment.book.title}</div>
                          <div className="text-xs text-gray-500">章节: {comment.chapter.title}</div>
                        </div>
                      ) : (
                        <div className="text-sm font-medium">{comment.book.title}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                        {new Date(comment.created_at).toLocaleString('zh-CN')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {comment.is_pinned ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs">
                          已置顶
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs">
                          正常
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.open(`/novel/${comment.book.id}`, '_blank')}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="查看"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(comment.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                          title="标记为敏感内容"
                        >
                          <Flag className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              共 {comments.length} 条记录
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                上一页
              </button>
              <span className="px-3 py-1">
                第 {currentPage} 页，共 {totalPages} 页
              </span>
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
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
              <h3 className="text-lg font-bold">确认删除</h3>
            </div>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              您确定要删除这条评论吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                onClick={() => showDeleteConfirm && handleDeleteComment(showDeleteConfirm)}
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

export default AdminComments;
