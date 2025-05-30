import React, { useEffect, useState } from 'react';
import { supabase, testConnection } from '../../lib/supabase';
import { Edit2, Trash2, CheckCircle, AlertCircle, WifiOff, RefreshCw, ArrowUpDown } from 'lucide-react';

interface Book {
  id: string;
  cover_url: string;
  is_internal: boolean;
  title: string;
  author_name: string;
  created_at: string;
  total_chapters: number;
  total_words: number;
  status: 'ongoing' | 'completed';
  last_updated_at: string;
  silver_income: number;
  gold_income: number;
  views: number;
  total_rewards: number;
  reward_gold_sum: number;
  votes: number;
  rating: number;
  likes: number;
  favorites: number;
  shares: number;
  review_status: string;
}

type SortField = 
  | 'created_at' 
  | 'total_words' 
  | 'reward_gold_sum' 
  | 'gold_income' 
  | 'views' 
  | 'votes' 
  | 'rating' 
  | 'likes' 
  | 'favorites'
  | 'shares'
  | 'author_name';

const AdminBooks = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [updatingInternalStatus, setUpdatingInternalStatus] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 20;
  const maxRetries = 3;
  const retryDelay = 2000;

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkSupabaseConnection().then(connected => {
        setIsSupabaseConnected(connected);
        if (connected) {
          fetchBooks();
        }
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsSupabaseConnected(false);
      setError('No internet connection. Please check your network and try again.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkSupabaseConnection().then(connected => {
      setIsSupabaseConnected(connected);
      if (connected && isOnline) fetchBooks();
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && isSupabaseConnected) {
      fetchBooks();
    }
  }, [currentPage, searchTerm, statusFilter, sortField, sortOrder]);

  const checkSupabaseConnection = async () => {
    try {
      await testConnection();
      setError(null);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Unable to connect to database: ${errorMessage}`);
      return false;
    }
  };

  const retryFetch = async () => {
    if (retryCount >= maxRetries) {
      setError('Maximum retry attempts reached.');
      return;
    }
    setRetryCount(prev => prev + 1);
    await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
    fetchBooks();
  };

  const fetchBooks = async () => {
    if (!isOnline) {
      setError('No internet connection.');
      setLoading(false);
      return;
    }

    if (!isSupabaseConnected) {
      setError('Database connection error.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use direct table queries with nested selects
      let query = supabase
        .from('books')
        .select(`
          id,
          title,
          cover_url,
          status,
          review_status,
          created_at,
          is_internal,
          author_id,
          author:user_profiles!books_author_id_fkey(username),
          metrics:book_metrics!book_metrics_book_id_fkey(
            word_count,
            read_count,
            vote_count,
            reward_count,
            like_count,
            favorite_count,
            share_count,
            rating,
            total_income
          ),
          chapters:chapters(id, word_count, created_at)
        `, { count: 'exact' })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,user_profiles.username.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply sorting
      if (sortField === 'author_name') {
        query = query.order('user_profiles.username', { ascending: sortOrder === 'asc', foreignTable: 'user_profiles' });
      } else if (['views', 'votes', 'rating', 'likes', 'favorites', 'shares'].includes(sortField)) {
        const metricsField = sortField === 'views' ? 'read_count' : 
                            sortField === 'votes' ? 'vote_count' : 
                            sortField === 'likes' ? 'like_count' : 
                            sortField === 'favorites' ? 'favorite_count' : 
                            sortField === 'shares' ? 'share_count' : 'rating';
        query = query.order(metricsField, { ascending: sortOrder === 'asc', foreignTable: 'book_metrics' });
      } else if (sortField === 'total_words') {
        // For total_words, we need to sort after fetching
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order(sortField, { ascending: sortOrder === 'asc' });
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw new Error(fetchError.message);

      // Transform the data to match the Book interface
      const transformedBooks = data?.map(book => {
        // Calculate total chapters
        const totalChapters = book.chapters ? book.chapters.length : 0;
        
        // Calculate total words
        const totalWords = book.chapters ? 
          book.chapters.reduce((sum: number, chapter: any) => sum + (chapter.word_count || 0), 0) : 0;
        
        // Get last updated date
        const lastUpdated = book.chapters && book.chapters.length > 0 ? 
          book.chapters.reduce((latest: string, chapter: any) => {
            return chapter.created_at > latest ? chapter.created_at : latest;
          }, book.created_at) : book.created_at;

        return {
          id: book.id,
          cover_url: book.cover_url,
          is_internal: book.is_internal || false,
          title: book.title,
          author_name: book.author?.username || 'Unknown',
          created_at: book.created_at,
          total_chapters: totalChapters,
          total_words: totalWords,
          status: book.status,
          last_updated_at: lastUpdated,
          silver_income: 0, // Placeholder
          gold_income: 0, // Placeholder
          views: book.metrics?.read_count || 0,
          total_rewards: book.metrics?.reward_count || 0,
          reward_gold_sum: 0, // Placeholder
          votes: book.metrics?.vote_count || 0,
          rating: book.metrics?.rating || 0,
          likes: book.metrics?.like_count || 0,
          favorites: book.metrics?.favorite_count || 0,
          shares: book.metrics?.share_count || 0,
          review_status: book.review_status
        };
      }) || [];

      setBooks(transformedBooks);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      setRetryCount(0);
      setIsSupabaseConnected(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Fetch error';
      setError(errorMsg);
      setIsSupabaseConnected(false);
      if (retryCount < maxRetries) retryFetch();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这本小说吗？')) return;
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (!error) fetchBooks();
    else setError(error.message);
  };

  const handleToggleInternalStatus = async (id: string, currentStatus: boolean) => {
    try {
      setUpdatingInternalStatus(id);
      const { error } = await supabase
        .from('books')
        .update({ is_internal: !currentStatus })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update the book in the local state
      setBooks(prevBooks => 
        prevBooks.map(book => 
          book.id === id ? { ...book, is_internal: !currentStatus } : book
        )
      );
    } catch (error) {
      console.error('Error toggling internal status:', error);
      alert('更新失败，请重试');
    } finally {
      setUpdatingInternalStatus(null);
    }
  };

  const handleRetry = async () => {
    if (!isOnline) {
      setError('Please check your network.');
      return;
    }
    setRetryCount(0);
    const connected = await checkSupabaseConnection();
    if (connected) fetchBooks();
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 flex flex-col items-center justify-center">
          {!isOnline || !isSupabaseConnected ? (
            <WifiOff className="w-12 h-12 text-red-500 mb-4" />
          ) : null}
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">Error Loading Books</h2>
          <p className="text-red-600 dark:text-red-300 text-center mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">小说管理</h1>
        <p className="text-gray-600 dark:text-gray-400 text-xs">管理系统中的所有小说</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="搜索小说标题或作者..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 w-full text-xs"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-xs"
            >
              <option value="all">全部</option>
              <option value="ongoing">连载中</option>
              <option value="completed">已完结</option>
            </select>
            
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-xs"
            >
              <option value="created_at">发布时间</option>
              <option value="total_words">总字数</option>
              <option value="reward_gold_sum">总打赏金币</option>
              <option value="gold_income">解锁金币收益</option>
              <option value="views">总阅读数</option>
              <option value="votes">总人气票</option>
              <option value="rating">评分</option>
              <option value="likes">点赞数</option>
              <option value="favorites">收藏数</option>
              <option value="shares">分享数</option>
              <option value="author_name">作者名</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-xs"
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2 px-2 text-xs">封面</th>
                <th className="text-left py-2 px-2 text-xs">内部</th>
                <th className="text-left py-2 px-2 text-xs">小说标题</th>
                <th className="text-left py-2 px-2 text-xs">作者</th>
                <th className="text-left py-2 px-2 text-xs">发布时间</th>
                <th className="text-left py-2 px-2 text-xs">章节数</th>
                <th className="text-left py-2 px-2 text-xs">总字数</th>
                <th className="text-left py-2 px-2 text-xs">状态</th>
                <th className="text-left py-2 px-2 text-xs">最后更新</th>
                <th className="text-left py-2 px-2 text-xs">银币收益</th>
                <th className="text-left py-2 px-2 text-xs">金币收益</th>
                <th className="text-left py-2 px-2 text-xs">阅读数</th>
                <th className="text-left py-2 px-2 text-xs">打赏次数</th>
                <th className="text-left py-2 px-2 text-xs">打赏金币</th>
                <th className="text-left py-2 px-2 text-xs">人气票</th>
                <th className="text-left py-2 px-2 text-xs">评分</th>
                <th className="text-left py-2 px-2 text-xs">点赞</th>
                <th className="text-left py-2 px-2 text-xs">收藏</th>
                <th className="text-left py-2 px-2 text-xs">分享</th>
                <th className="text-left py-2 px-2 text-xs">状态</th>
                <th className="text-left py-2 px-2 text-xs">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={21} className="text-center py-4 text-xs">加载中...</td></tr>
              ) : books.length === 0 ? (
                <tr><td colSpan={21} className="text-center py-4 text-xs">暂无数据</td></tr>
              ) : (
                books.map((book) => (
                  <tr key={book.id} className="border-b dark:border-gray-700 text-xs">
                    <td className="py-2 px-2">
                      <div className="w-20 h-28 bg-gray-100 flex items-center justify-center rounded overflow-hidden">
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <button 
                        onClick={() => handleToggleInternalStatus(book.id, book.is_internal)}
                        disabled={updatingInternalStatus === book.id}
                        className={`px-2 py-1 rounded-full text-xs ${
                          book.is_internal
                            ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        } ${updatingInternalStatus === book.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-opacity-80'}`}
                      >
                        {updatingInternalStatus === book.id ? '更新中...' : book.is_internal ? '是' : '否'}
                      </button>
                    </td>
                    <td className="py-2 px-2">{book.title}</td>
                    <td className="py-2 px-2">{book.author_name || '无'}</td>
                    <td className="py-2 px-2">{new Date(book.created_at).toLocaleDateString('zh-CN')}</td>
                    <td className="py-2 px-2">{book.total_chapters || 0}</td>
                    <td className="py-2 px-2">{book.total_words?.toLocaleString() || 0}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        book.status === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {book.status === 'completed' ? '已完结' : '连载中'}
                      </span>
                    </td>
                    <td className="py-2 px-2">{book.last_updated_at ? new Date(book.last_updated_at).toLocaleDateString('zh-CN') : '暂无'}</td>
                    <td className="py-2 px-2">{book.silver_income || 0}</td>
                    <td className="py-2 px-2">{book.gold_income || 0}</td>
                    <td className="py-2 px-2">{book.views?.toLocaleString() || 0}</td>
                    <td className="py-2 px-2">{book.total_rewards || 0}</td>
                    <td className="py-2 px-2">{book.reward_gold_sum || 0}</td>
                    <td className="py-2 px-2">{book.votes || 0}</td>
                    <td className="py-2 px-2">{book.rating?.toFixed(1) || '0.0'}</td>
                    <td className="py-2 px-2">{book.likes || 0}</td>
                    <td className="py-2 px-2">{book.favorites || 0}</td>
                    <td className="py-2 px-2">{book.shares || 0}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        book.review_status === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : book.review_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {book.review_status === 'approved' ? '已通过' : 
                         book.review_status === 'pending' ? '待审核' : '已驳回'}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex gap-2">
                        <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(book.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
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

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400 text-xs">共 {books.length} 条记录</div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50 text-xs">上一页</button>
            <span className="px-3 py-1 text-xs">第 {currentPage} 页，共 {totalPages} 页</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50 text-xs">下一页</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBooks;