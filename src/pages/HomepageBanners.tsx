import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Image, 
  Link as LinkIcon, 
  ArrowUp, 
  ArrowDown, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Eye, 
  ToggleLeft, 
  ToggleRight 
} from 'lucide-react';

interface Banner {
  id: string;
  image_url: string;
  title: string;
  link_url: string;
  order: number;
  is_active: boolean;
  created_at: string;
}

interface BannerFormData {
  image_url: string;
  title: string;
  link_url: string;
  order: number;
  is_active: boolean;
}

const HomepageBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentBannerId, setCurrentBannerId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BannerFormData>({
    image_url: '',
    title: '',
    link_url: '',
    order: 0,
    is_active: true
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('homepage_banners')
        .select('*')
        .order('order');

      if (error) throw error;
      setBanners(data || []);
    } catch (err) {
      console.error('Error fetching banners:', err);
      setError('获取轮播图数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || !event.target.files[0]) return;

      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('图片大小不能超过5MB');
        return;
      }

      setUploading(true);
      setError('');

      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('上传图片失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      if (!formData.image_url) {
        setError('请上传图片');
        return;
      }
      
      if (!formData.title.trim()) {
        setError('请输入标题');
        return;
      }
      
      if (!formData.link_url.trim()) {
        setError('请输入链接URL');
        return;
      }
      
      if (isEditMode && currentBannerId) {
        // Update existing banner
        const { error } = await supabase
          .from('homepage_banners')
          .update({
            image_url: formData.image_url,
            title: formData.title,
            link_url: formData.link_url,
            order: formData.order,
            is_active: formData.is_active
          })
          .eq('id', currentBannerId);
          
        if (error) throw error;
        setSuccess('轮播图更新成功');
      } else {
        // Create new banner
        const { error } = await supabase
          .from('homepage_banners')
          .insert([{
            image_url: formData.image_url,
            title: formData.title,
            link_url: formData.link_url,
            order: formData.order,
            is_active: formData.is_active
          }]);
          
        if (error) throw error;
        setSuccess('轮播图创建成功');
      }
      
      // Reset form and close modal
      setFormData({
        image_url: '',
        title: '',
        link_url: '',
        order: 0,
        is_active: true
      });
      setIsModalOpen(false);
      setIsEditMode(false);
      setCurrentBannerId(null);
      
      // Refresh banners list
      fetchBanners();
    } catch (err) {
      console.error('Error saving banner:', err);
      setError('保存轮播图失败');
    }
  };

  const handleEdit = (banner: Banner) => {
    setFormData({
      image_url: banner.image_url,
      title: banner.title,
      link_url: banner.link_url,
      order: banner.order,
      is_active: banner.is_active
    });
    setCurrentBannerId(banner.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个轮播图吗？')) return;
    
    try {
      const { error } = await supabase
        .from('homepage_banners')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccess('轮播图删除成功');
      fetchBanners();
    } catch (err) {
      console.error('Error deleting banner:', err);
      setError('删除轮播图失败');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('homepage_banners')
        .update({ is_active: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccess(`轮播图${!currentStatus ? '已启用' : '已禁用'}`);
      fetchBanners();
    } catch (err) {
      console.error('Error toggling banner status:', err);
      setError('更新轮播图状态失败');
    }
  };

  const handleMoveUp = async (id: string, currentOrder: number) => {
    try {
      // Find the banner above this one
      const prevBanner = banners.find(b => b.order === currentOrder - 1);
      if (!prevBanner) return;
      
      // Swap orders
      const { error: error1 } = await supabase
        .from('homepage_banners')
        .update({ order: currentOrder })
        .eq('id', prevBanner.id);
        
      const { error: error2 } = await supabase
        .from('homepage_banners')
        .update({ order: currentOrder - 1 })
        .eq('id', id);
        
      if (error1) throw error1;
      if (error2) throw error2;
      
      fetchBanners();
    } catch (error) {
      console.error('Error reordering banners:', error);
      setError('重新排序轮播图失败');
    }
  };

  const handleMoveDown = async (id: string, currentOrder: number) => {
    try {
      // Find the banner below this one
      const nextBanner = banners.find(b => b.order === currentOrder + 1);
      if (!nextBanner) return;
      
      // Swap orders
      const { error: error1 } = await supabase
        .from('homepage_banners')
        .update({ order: currentOrder })
        .eq('id', nextBanner.id);
        
      const { error: error2 } = await supabase
        .from('homepage_banners')
        .update({ order: currentOrder + 1 })
        .eq('id', id);
        
      if (error1) throw error1;
      if (error2) throw error2;
      
      fetchBanners();
    } catch (error) {
      console.error('Error reordering banners:', error);
      setError('重新排序轮播图失败');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">首页轮播图</h1>
        <p className="text-gray-600 dark:text-gray-400">管理首页显示的轮播图</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => {
              setFormData({
                image_url: '',
                title: '',
                link_url: '',
                order: banners.length,
                is_active: true
              });
              setIsEditMode(false);
              setCurrentBannerId(null);
              setIsModalOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            添加轮播图
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Image className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400">暂无轮播图</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4">图片</th>
                  <th className="text-left py-3 px-4">标题</th>
                  <th className="text-left py-3 px-4">链接</th>
                  <th className="text-left py-3 px-4">排序</th>
                  <th className="text-left py-3 px-4">状态</th>
                  <th className="text-left py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((banner) => (
                  <tr key={banner.id} className="border-b dark:border-gray-700">
                    <td className="py-3 px-4">
                      <div className="w-20 h-12 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                        <img 
                          src={banner.image_url} 
                          alt={banner.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">{banner.title}</td>
                    <td className="py-3 px-4">
                      <a 
                        href={banner.link_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 flex items-center"
                      >
                        <LinkIcon className="h-4 w-4 mr-1" />
                        <span className="truncate max-w-[150px]">{banner.link_url}</span>
                      </a>
                    </td>
                    <td className="py-3 px-4">{banner.order}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActive(banner.id, banner.is_active)}
                        className="flex items-center"
                      >
                        {banner.is_active ? (
                          <>
                            <ToggleRight className="h-5 w-5 text-green-500 mr-1" />
                            <span className="text-green-500">已启用</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-5 w-5 text-gray-400 mr-1" />
                            <span className="text-gray-500">已禁用</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMoveUp(banner.id, banner.order)}
                          disabled={banner.order === 0}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                          title="上移"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(banner.id, banner.order)}
                          disabled={banner.order === banners.length - 1}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                          title="下移"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(banner)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="编辑"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <a
                          href={banner.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="预览"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Banner Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {isEditMode ? '编辑轮播图' : '添加轮播图'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">轮播图图片</label>
                <div className="flex items-center gap-2">
                  {formData.image_url ? (
                    <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <img 
                        src={formData.image_url} 
                        alt="轮播图预览" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center">
                      <Image className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">暂无图片</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 px-3 py-1 bg-primary-600 text-white text-sm rounded-lg"
                      >
                        {uploading ? '上传中...' : '选择图片'}
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">链接URL</label>
                <input
                  type="text"
                  value={formData.link_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">显示顺序</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
                  min="0"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is-active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is-active" className="text-sm font-medium">启用</label>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {isEditMode ? '更新' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomepageBanners;
