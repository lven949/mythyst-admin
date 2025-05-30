import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Edit2, Trash2, CheckCircle, AlertCircle, WifiOff, RefreshCw, ArrowUpDown } from 'lucide-react';

interface BookReport {
  id: string;
  type: string;
  text: string;
  created_at: string;
  book: {
    title: string;
  };
  user_profiles: {
    username: string;
  };
}

const AdminReports = () => {
  const [reports, setReports] = useState<BookReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 10;

  useEffect(() => {
    fetchReports();
  }, [currentPage, searchTerm, sortOrder]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('book_reports')
        .select(`
          id,
          type,
          text,
          created_at,
          book:books(title),
          user_profiles(username)
        `)
        .order('created_at', { ascending: sortOrder === 'asc' })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (searchTerm) {
        query = query.or(
          `text.ilike.%${searchTerm}%,books.title.ilike.%${searchTerm}%`
        );
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setReports(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsResolved = async (id: string, currentText: string) => {
    try {
      const { error } = await supabase
        .from('book_reports')
        .update({ text: `${currentText} [已处理]` })
        .eq('id', id);

      if (error) throw error;

      fetchReports();
    } catch (error) {
      console.error('Error marking report as resolved:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条举报记录吗？')) return;

    try {
      const { error } = await supabase
        .from('book_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  const toggleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">举报管理</h1>
        <p className="text-gray-600 dark:text-gray-400">管理用户提交的内容举报信息</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <input
            type="text"
            placeholder="搜索举报内容或小说名..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4">小说标题</th>
                <th className="text-left py-3 px-4">举报类型</th>
                <th className="text-left py-3 px-4">举报内容</th>
                <th className="text-left py-3 px-4">用户昵称</th>
                <th className="text-left py-3 px-4 cursor-pointer" onClick={toggleSort}>
                  举报时间 {sortOrder === 'asc' ? '↑' : '↓'}
                </th>
                <th className="text-left py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">加载中...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">暂无举报记录</td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="border-b dark:border-gray-700">
                    <td className="py-3 px-4">{report.book.title}</td>
                    <td className="py-3 px-4">{report.type}</td>
                    <td className="py-3 px-4">
                      <p className="line-clamp-2">{report.text}</p>
                    </td>
                    <td className="py-3 px-4">{report.user_profiles?.username || 'Unknown'}</td>
                    <td className="py-3 px-4">
                      {new Date(report.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {!report.text.includes('[已处理]') && (
                          <button
                            onClick={() => handleMarkAsResolved(report.id, report.text)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="标记已处理"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(report.id)}
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

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            共 {reports.length} 条记录
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
      </div>
    </div>
  );
};

export default AdminReports;
