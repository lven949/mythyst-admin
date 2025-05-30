import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, AlertCircle, CheckCircle, X, HelpCircle, Loader2 } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  description: string;
}

interface Modal {
  isOpen: boolean;
  type: 'create' | 'edit';
  data?: Tag;
}

const ShortStoryTagsPage = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modal, setModal] = useState<Modal>({ isOpen: false, type: 'create' });
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('short_story_tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      setError('获取标签数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (modal.type === 'create') {
        const { error } = await supabase
          .from('short_story_tags')
          .insert([{ name: formData.name, description: formData.description }]);

        if (error) throw error;
        setSuccess('标签创建成功');
      } else if (modal.type === 'edit' && modal.data) {
        const { error } = await supabase
          .from('short_story_tags')
          .update({ name: formData.name, description: formData.description })
          .eq('id', modal.data.id);

        if (error) throw error;
        setSuccess('标签更新成功');
      }

      setModal({ isOpen: false, type: 'create' });
      setFormData({ name: '', description: '' });
      fetchTags();
    } catch (error) {
      console.error('Error saving tag:', error);
      setError('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个标签吗？')) return;

    try {
      const { error } = await supabase
        .from('short_story_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccess('标签删除成功');
      fetchTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
      setError('删除失败');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">短篇故事标签管理</h1>
        <p className="text-gray-600 dark:text-gray-400">管理系统中的所有短篇故事标签</p>
      </div>

      {(error || success) && (
        <div className={`mb-6 p-4 rounded-lg flex items-center ${
          error 
            ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
        }`}>
          {error ? <AlertCircle className="h-5 w-5 mr-2" /> : <CheckCircle className="h-5 w-5 mr-2" />}
          {error || success}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setModal({ isOpen: true, type: 'create' })}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            新增标签
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4">标签名称</th>
                <th className="text-left py-3 px-4">解释说明</th>
                <th className="text-left py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : tags.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-4 text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                tags.map((tag) => (
                  <tr key={tag.id} className="border-b dark:border-gray-700">
                    <td className="py-3 px-4">{tag.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {tag.description || '暂无说明'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setFormData({ name: tag.name, description: tag.description });
                            setModal({ isOpen: true, type: 'edit', data: tag });
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tag.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
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
      </div>

      {/* Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {modal.type === 'create' ? '新增标签' : '编辑标签'}
              </h2>
              <button
                onClick={() => setModal({ isOpen: false, type: 'create' })}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">标签名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">解释说明</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setModal({ isOpen: false, type: 'create' })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortStoryTagsPage;
