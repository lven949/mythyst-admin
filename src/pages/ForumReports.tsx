import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Loader2, 
  CheckCircle, 
  Trash2, 
  AlertCircle, 
  Flag, 
  User, 
  Calendar,
  ExternalLink,
  X,
  Filter
} from 'lucide-react';

interface Report {
  id: string;
  target_id: string;
  target_type: 'post' | 'comment';
  reason: string;
  created_at: string;
  reporter: {
    username: string;
  };
  target_info?: {
    title?: string;
    content?: string;
  };
}

const ForumReports = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const reportsPerPage = 10;

  useEffect(() => {
    fetchReports();
  }, [currentPage]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // Get total count for pagination
      const { count, error: countError } = await supabase
        .from('forum_reports')
        .select('id', { count: 'exact', head: true });
      
      if (countError) throw countError;
      
      setTotalPages(Math.ceil((count || 0) / reportsPerPage));
      
      // Get report data
      const { data, error } = await supabase
        .from('forum_reports')
        .select(`
          id,
          target_id,
          target_type,
          reason,
          created_at,
          reporter:user_profiles!forum_reports_reporter_id_fkey(username)
        `)
        .range((currentPage - 1) * reportsPerPage, currentPage * reportsPerPage - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get target content info for each report
      const reportsWithInfo = await Promise.all((data || []).map(async (report) => {
        let targetInfo = {};
        
        if (report.target_type === 'post') {
          const { data: postData } = await supabase
            .from('forum_posts')
            .select('content')
            .eq('id', report.target_id)
            .maybeSingle();
            
          targetInfo = { content: postData?.content };
        }
        
        return {
          ...report,
          target_info: targetInfo
        };
      }));

      setReports(reportsWithInfo);
    } catch (error) {
      console.error('获取举报失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (report: Report) => {
    try {
      if (!window.confirm('确定要删除被举报的内容吗？')) return;

      if (report.target_type === 'post') {
        // Delete the post
        const { error: postError } = await supabase
          .from('forum_posts')
          .delete()
          .eq('id', report.target_id);

        if (postError) throw postError;
      }

      // Delete the report
      const { error: reportError } = await supabase
        .from('forum_reports')
        .delete()
        .eq('id', report.id);

      if (reportError) throw reportError;

      fetchReports();
      setShowReportModal(false);
    } catch (error) {
      console.error('删除内容失败:', error);
      alert('删除内容失败');
    }
  };

  const viewReportDetails = (report: Report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">论坛举报管理</h1>
        <p className="text-gray-600 dark:text-gray-400">管理用户对论坛内容的举报</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4">举报内容</th>
                  <th className="text-left py-3 px-4">类型</th>
                  <th className="text-left py-3 px-4">举报人</th>
                  <th className="text-left py-3 px-4">原因</th>
                  <th className="text-left py-3 px-4">日期</th>
                  <th className="text-left py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      没有找到举报
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="border-b dark:border-gray-700">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => viewReportDetails(report)}
                          className="text-primary-600 hover:text-primary-700 hover:underline flex items-center"
                        >
                          {report.target_type === 'post' ? '帖子' : '评论'}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          report.target_type === 'post'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {report.target_type === 'post' ? '帖子' : '评论'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-1" />
                          {report.reporter.username}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="max-w-xs truncate" title={report.reason}>
                          {report.reason}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                          {new Date(report.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => viewReportDetails(report)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="删除内容"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <div className="flex space-x-2">
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

      {/* Report Details Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 z-20 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowReportModal(false)}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center">
                <Flag className="h-5 w-5 text-red-500 mr-2" />
                举报详情
              </h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">举报信息</h3>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">举报人</p>
                      <p>{selectedReport.reporter.username}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">举报时间</p>
                      <p>{new Date(selectedReport.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">内容类型</p>
                      <p className="capitalize">{selectedReport.target_type === 'post' ? '帖子' : '评论'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">举报原因</h3>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <p>{selectedReport.reason}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">被举报内容</h3>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div>
                    <p className="font-medium">内容:</p>
                    <p className="whitespace-pre-wrap">{selectedReport.target_info?.content || '内容不可用'}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  关闭
                </button>
                <button
                  onClick={() => handleDelete(selectedReport)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  删除内容
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumReports;
