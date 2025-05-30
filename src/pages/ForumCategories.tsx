import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  X, 
  HelpCircle, 
  Loader2,
  MessageSquare,
  Users,
  TrendingUp,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

interface CategoryModal {
  isOpen: boolean;
  type: 'create' | 'edit';
  data: Omit<ForumCategory, 'id'>;
  id?: string;
  loading: boolean;
  error: string;
}

const iconOptions = [
  { value: 'message-square', label: '消息方块', component: MessageSquare },
  { value: 'users', label: '用户', component: Users },
  { value: 'trending-up', label: '趋势', component: TrendingUp }
];

const ForumCategories = () => {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<CategoryModal>({
    isOpen: false,
    type: 'create',
    data: {
      name: '',
      description: '',
      icon: 'message-square',
      sort_order: 0,
      is_active: true
    },
    loading: false,
    error: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('获取分类失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModal(prev => ({ ...prev, loading: true, error: '' }));

    try {
      const { name, description, icon, sort_order, is_active } = modal.data;
      
      // 验证输入
      if (!name.trim()) throw new Error('分类名称不能为空');
      if (!description.trim()) throw new Error('分类描述不能为空');

      if (modal.type === 'create') {
        const { error } = await supabase
          .from('forum_categories')
          .insert([{ 
            name, 
            description, 
            icon, 
            sort_order, 
            is_active 
          }]);
        if (error) throw error;
      } else if (modal.id) {
        const { error } = await supabase
          .from('forum_categories')
          .update({ 
            name, 
            description, 
            icon, 
            sort_order, 
            is_active 
          })
          .eq('id', modal.id);
        if (error) throw error;
      }

      setModal({
        isOpen: false,
        type: 'create',
        data: {
          name: '',
          description: '',
          icon: 'message-square',
          sort_order: 0,
          is_active: true
        },
        loading: false,
        error: ''
      });
      fetchCategories();
    } catch (error) {
      console.error('保存分类失败:', error);
      setModal(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : '保存分类失败' 
      }));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('forum_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDeleteConfirm(null);
      fetchCategories();
    } catch (error) {
      console.error('删除分类失败:', error);
      alert('删除分类失败。可能存在关联的主题。');
    }
  };

  const handleEdit = (category: ForumCategory) => {
    setModal({
      isOpen: true,
      type: 'edit',
      id: category.id,
      data: {
        name: category.name,
        description: category.description,
        icon: category.icon,
        sort_order: category.sort_order,
        is_active: category.is_active
      },
      loading: false,
      error: ''
    });
  };

  const handleMoveUp = async (id: string, currentOrder: number) => {
    try {
      // 查找上一个分类
      const prevCategory = categories.find(c => c.sort_order === currentOrder - 1);
      if (!prevCategory) return;

      // 交换排序顺序
      const { error: error1 } = await supabase
        .from('forum_categories')
        .update({ sort_order: currentOrder })
        .eq('id', prevCategory.id);

      const { error: error2 } = await supabase
        .from('forum_categories')
        .update({ sort_order: currentOrder - 1 })
        .eq('id', id);

      if (error1) throw error1;
      if (error2) throw error2;

      fetchCategories();
    } catch (error) {
      console.error('移动分类失败:', error);
    }
  };

  const handleMoveDown = async (id: string, currentOrder: number) => {
    try {
      // 查找下一个分类
      const nextCategory = categories.find(c => c.sort_order === currentOrder + 1);
      if (!nextCategory) return;

      // 交换排序顺序
      const { error: error1 } = await supabase
        .from('forum_categories')
        .update({ sort_order: currentOrder })
        .eq('id', nextCategory.id);

      const { error: error2 } = await supabase
        .from('forum_categories')
        .update({ sort_order: currentOrder + 1 })
        .eq('id', id);

      if (error1) throw error1;
      if (error2) throw error2;

      fetchCategories();
    } catch (error) {
      console.error('移动分类失败:', error);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('forum_categories')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchCategories();
    } catch (error) {
      console.error('切换分类状态失败:', error);
    }
  };

  const renderIcon = (iconName: string) => {
    const icon = iconOptions.find(i => i.value === iconName);
    if (!icon) return <MessageSquare className="h-5 w-5" />;
    
    const IconComponent = icon.component;
    return <IconComponent className="h-5 w-5" />;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">论坛板块管理</h1>
        <p className="text-gray-600 dark:text-gray-400">管理论坛板块和显示顺序</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setModal({ 
              isOpen: true, 
              type: 'create', 
              data: {
                name: '',
                description: '',
                icon: 'message-square',
                sort_order: categories.length,
                is_active: true
              },
              loading: false,
              error: ''
            })}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            添加板块
          </button>
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
                  <th className="text-left py-3 px-4">名称</th>
                  <th className="text-left py-3 px-4">描述</th>
                  <th className="text-left py-3 px-4">图标</th>
                  <th className="text-left py-3 px-4">排序</th>
                  <th className="text-left py-3 px-4">状态</th>
                  <th className="text-left py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      暂无分类
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="border-b dark:border-gray-700">
                      <td className="py-3 px-4 font-medium">{category.name}</td>
                      <td className="py-3 px-4">{category.description}</td>
                      <td className="py-3 px-4">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full inline-block">
                          {renderIcon(category.icon)}
                        </div>
                      </td>
                      <td className="py-3 px-4">{category.sort_order}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          category.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {category.is_active ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMoveUp(category.id, category.sort_order)}
                            disabled={category.sort_order === 0}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                            title="上移"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(category.id, category.sort_order)}
                            disabled={category.sort_order === categories.length - 1}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                            title="下移"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(category.id, category.is_active)}
                            className={`p-1 rounded ${
                              category.is_active
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                            title={category.is_active ? '禁用' : '启用'}
                          >
                            {category.is_active ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(category)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="编辑"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(category.id)}
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
      </div>

      {/* 添加/编辑分类模态框 */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {modal.type === 'create' ? '添加板块' : '编辑板块'}
              </h2>
              <button
                onClick={() => setModal(prev => ({ ...prev, isOpen: false }))}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modal.error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{modal.error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">名称</label>
                <input
                  type="text"
                  value={modal.data.name}
                  onChange={(e) => setModal({ 
                    ...modal, 
                    data: { ...modal.data, name: e.target.value } 
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">描述</label>
                <textarea
                  value={modal.data.description}
                  onChange={(e) => setModal({ 
                    ...modal, 
                    data: { ...modal.data, description: e.target.value } 
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">图标</label>
                <div className="grid grid-cols-3 gap-2">
                  {iconOptions.map((icon) => {
                    const IconComponent = icon.component;
                    return (
                      <button
                        key={icon.value}
                        type="button"
                        onClick={() => setModal({ 
                          ...modal, 
                          data: { ...modal.data, icon: icon.value } 
                        })}
                        className={`flex items-center justify-center p-3 border rounded-lg ${
                          modal.data.icon === icon.value
                            ? 'bg-primary-50 border-primary-500 text-primary-600 dark:bg-primary-900/30 dark:border-primary-500 dark:text-primary-400'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <IconComponent className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">排序</label>
                <input
                  type="number"
                  value={modal.data.sort_order}
                  onChange={(e) => setModal({ 
                    ...modal, 
                    data: { ...modal.data, sort_order: parseInt(e.target.value) || 0 } 
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
                  min="0"
                  required
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={modal.data.is_active}
                  onChange={(e) => setModal({ 
                    ...modal, 
                    data: { ...modal.data, is_active: e.target.checked } 
                  })}
                  className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  id="is-active"
                />
                <label htmlFor="is-active" className="text-sm font-medium">启用</label>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 border rounded-lg dark:border-gray-600"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={modal.loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
                >
                  {modal.loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    '保存'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">确认删除</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              确定要删除这个分类吗？这将同时删除所有关联的主题和帖子。
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border rounded-lg dark:border-gray-600"
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

export default ForumCategories;
