import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Edit2, Trash2, Star, Clock, Plus, Upload } from 'lucide-react';
import Papa from 'papaparse';

interface Chapter {
  id: string;
  title: string;
  content?: string;
  is_vip: boolean;
  created_at: string;
  publish_at: string | null;
  order: number;
  book: {
    title: string;
  };
}

interface Book {
  id: string;
  title: string;
}

interface ChapterModal {
  isOpen: boolean;
  type: 'create' | 'edit' | 'import';
  data?: Chapter;
}

const AdminChapters = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vipFilter, setVipFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState<'created_at' | 'publish_at' | 'order'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [modal, setModal] = useState<ChapterModal>({ isOpen: false, type: 'create' });
  const [selectedBookId, setSelectedBookId] = useState('');
  const [newChapter, setNewChapter] = useState({
    book_id: '',
    title: '',
    content: '',
    is_vip: false,
    publish_at: '',
    order: 1
  });
  const itemsPerPage = 10;

  useEffect(() => {
    fetchChapters();
    fetchBooks();
    // eslint-disable-next-line
  }, [currentPage, searchTerm, vipFilter, sortField, sortOrder]);

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('id, title')
        .order('title');

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const fetchChapters = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('chapters')
        .select(`
          *,
          book:books(title)
        `)
        .order(sortField, { ascending: sortOrder === 'asc' })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,books.title.ilike.%${searchTerm}%`);
      }

      if (vipFilter !== 'all') {
        query = query.eq('is_vip', vipFilter === 'vip');
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setChapters(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('chapters')
        .insert([newChapter]);

      if (error) throw error;

      setModal({ isOpen: false, type: 'create' });
      setNewChapter({
        book_id: '',
        title: '',
        content: '',
        is_vip: false,
        publish_at: '',
        order: 1
      });
      fetchChapters();
    } catch (error) {
      console.error('Error creating chapter:', error);
    }
  };

  const handleCSVImport = async (file: File) => {
  if (!selectedBookId) {
    alert('请先选择小说');
    return;
  }

  Papa.parse(file, {
    header: true, // ✅ 自动读取表头
    skipEmptyLines: true,
    complete: async (results) => {
      try {
        const chapters = results.data.map((row: any, index: number) => {
  const content = row.content || '';
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return {
    book_id: selectedBookId,
    order: Number(row.order),
    title: row.title?.trim() || `章节 ${index + 1}`,
    content,
    is_vip: String(row.is_vip).toLowerCase() === 'true', // ✅ 改这里
    publish_at: row.publish_at || null,
    word_count: wordCount
  };
});

        const { error } = await supabase.from('chapters').insert(chapters);
        if (error) throw error;

        setModal({ isOpen: false, type: 'import' });
        fetchChapters();
      } catch (error) {
        console.error('Error importing chapters:', error);
        alert('导入失败，请检查CSV格式是否正确');
      }
    }
  });
};

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个章节吗？')) return;

    try {
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchChapters();
    } catch (error) {
      console.error('Error deleting chapter:', error);
    }
  };

  const handleVipToggle = async (id: string) => {
    try {
      const { error } = await supabase
        .from('chapters')
        .update({ is_vip: true })
        .eq('id', id);

      if (error) throw error;

      fetchChapters();
    } catch (error) {
      console.error('Error updating chapter VIP status:', error);
    }
  };

  const handlePublishNow = async (id: string) => {
    try {
      const { error } = await supabase
        .from('chapters')
        .update({ publish_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      fetchChapters();
    } catch (error) {
      console.error('Error publishing chapter:', error);
    }
  };

  const toggleSort = (field: 'created_at' | 'publish_at' | 'order') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">章节管理</h1>
        <p className="text-gray-600 dark:text-gray-400">管理系统中的所有章节</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="搜索章节标题或小说名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <select
              value={vipFilter}
              onChange={(e) => setVipFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">显示全部</option>
              <option value="vip">VIP章节</option>
              <option value="free">非VIP章节</option>
            </select>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setModal({ isOpen: true, type: 'create' })}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              新增章节
            </button>
            <button
              onClick={() => setModal({ isOpen: true, type: 'import' })}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              批量导入章节（CSV）
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4 cursor-pointer" onClick={() => toggleSort('order')}>
                  顺序 {sortField === 'order' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-3 px-4">所属小说</th>
                <th className="text-left py-3 px-4">章节标题</th>
                <th className="text-left py-3 px-4">是否VIP</th>
                <th className="text-left py-3 px-4 cursor-pointer" onClick={() => toggleSort('created_at')}>
                  发布时间 {sortField === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-3 px-4 cursor-pointer" onClick={() => toggleSort('publish_at')}>
                  定时发布时间 {sortField === 'publish_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">加载中...</td>
                </tr>
              ) : chapters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">暂无数据</td>
                </tr>
              ) : (
                chapters.map((chapter) => (
                  <tr key={chapter.id} className="border-b dark:border-gray-700">
                    <td className="py-3 px-4">{chapter.order}</td>
                    <td className="py-3 px-4">{chapter.book.title}</td>
                    <td className="py-3 px-4">{chapter.title}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        chapter.is_vip
                          ? 'bg-primary-100 text-primary-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {chapter.is_vip ? 'VIP' : '免费'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {new Date(chapter.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="py-3 px-4">
                      {chapter.publish_at
                        ? new Date(chapter.publish_at).toLocaleString('zh-CN')
                        : '未设置'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setModal({ isOpen: true, type: 'edit', data: chapter })}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="编辑"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(chapter.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {!chapter.is_vip && (
                          <button
                            onClick={() => handleVipToggle(chapter.id)}
                            className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                            title="设为VIP"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        )}
                        {!chapter.publish_at && (
                          <button
                            onClick={() => handlePublishNow(chapter.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="立即发布"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                        )}
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
            共 {chapters.length} 条记录
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

      {/* Create/Edit Chapter Modal */}
      {modal.isOpen && modal.type !== 'import' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">
              {modal.type === 'create' ? '新增章节' : '编辑章节'}
            </h2>
            <form onSubmit={handleCreateChapter} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">所属小说</label>
                <select
                  value={newChapter.book_id}
                  onChange={(e) => setNewChapter({ ...newChapter, book_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="">选择小说</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>{book.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">章节顺序（数字，越小越前）</label>
                <input
                  type="number"
                  value={newChapter.order}
                  min={1}
                  onChange={(e) => setNewChapter({ ...newChapter, order: Number(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">章节标题</label>
                <input
                  type="text"
                  value={newChapter.title}
                  onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">内容</label>
                <textarea
                  value={newChapter.content}
                  onChange={(e) => setNewChapter({ ...newChapter, content: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg h-40"
                  required
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newChapter.is_vip}
                  onChange={(e) => setNewChapter({ ...newChapter, is_vip: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium">是否VIP章节</label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">定时发布时间</label>
                <input
                  type="datetime-local"
                  value={newChapter.publish_at}
                  onChange={(e) => setNewChapter({ ...newChapter, publish_at: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setModal({ isOpen: false, type: 'create' })}
                  className="px-4 py-2 border rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg"
                >
                  确定
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {modal.isOpen && modal.type === 'import' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">批量导入章节</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">选择小说</label>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="">选择小说</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>{book.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">上传CSV文件</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files && handleCSVImport(e.target.files[0])}
                  className="w-full"
                />
                <p className="text-sm text-gray-500 mt-2">
                  CSV格式要求：order,title,content,is_vip,publish_at
                  <br />
                  <b>示例：</b><br />
                  1,第一章,内容,false,<br />
                  2,第二章,内容,true,2024-06-01T12:00:00
                </p>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setModal({ isOpen: false, type: 'import' })}
                  className="px-4 py-2 border rounded-lg"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChapters;
