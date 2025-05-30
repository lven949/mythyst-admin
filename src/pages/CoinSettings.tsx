import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, DollarSign, Loader2, Check, AlertCircle, Image, X } from 'lucide-react';

interface CoinPackage {
  id: string;
  price_usd: number;
  coin_amount: number;
  bonus_coins: number;
  is_active: boolean;
  sort_order: number;
  icon_url?: string;
}

interface PackageModal {
  isOpen: boolean;
  type: 'create' | 'edit';
  data: Omit<CoinPackage, 'id'>;
  loading: boolean;
  error: string;
}

const AdminCoinSettings = () => {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<PackageModal>({
    isOpen: false,
    type: 'create',
    data: {
      price_usd: 0,
      coin_amount: 0,
      bonus_coins: 0,
      is_active: true,
      sort_order: 0,
      icon_url: ''
    },
    loading: false,
    error: ''
  });
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coin_packages')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModal(prev => ({ ...prev, loading: true, error: '' }));

    try {
      const { price_usd, coin_amount, bonus_coins, is_active, sort_order, icon_url } = modal.data;
      
      // Validate inputs
      if (price_usd <= 0) throw new Error('Price must be greater than 0');
      if (coin_amount <= 0) throw new Error('Coin amount must be greater than 0');
      if (sort_order < 0) throw new Error('Sort order cannot be negative');

      if (modal.type === 'create') {
        const { error } = await supabase
          .from('coin_packages')
          .insert([{ 
            price_usd, 
            coin_amount, 
            bonus_coins, 
            is_active, 
            sort_order,
            icon_url
          }]);
        if (error) throw error;
      } else if (selectedPackageId) {
        const { error } = await supabase
          .from('coin_packages')
          .update({ 
            price_usd, 
            coin_amount, 
            bonus_coins, 
            is_active, 
            sort_order,
            icon_url
          })
          .eq('id', selectedPackageId);
        if (error) throw error;
      }

      setModal({
        isOpen: false,
        type: 'create',
        data: {
          price_usd: 0,
          coin_amount: 0,
          bonus_coins: 0,
          is_active: true,
          sort_order: 0,
          icon_url: ''
        },
        loading: false,
        error: ''
      });
      setSelectedPackageId(null);
      fetchPackages();
    } catch (error) {
      console.error('Error saving package:', error);
      setModal(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to save package' 
      }));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('coin_packages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDeleteConfirm(null);
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
    }
  };

  const handleEdit = (pkg: CoinPackage) => {
    setSelectedPackageId(pkg.id);
    setModal({
      isOpen: true,
      type: 'edit',
      data: {
        price_usd: pkg.price_usd,
        coin_amount: pkg.coin_amount,
        bonus_coins: pkg.bonus_coins,
        is_active: pkg.is_active,
        sort_order: pkg.sort_order,
        icon_url: pkg.icon_url || ''
      },
      loading: false,
      error: ''
    });
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('coin_packages')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchPackages();
    } catch (error) {
      console.error('Error toggling package status:', error);
    }
  };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || !event.target.files[0]) return;

      const file = event.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setModal(prev => ({ ...prev, error: 'Image size must be less than 2MB' }));
        return;
      }

      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `coin-package-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('coin-icons')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('coin-icons')
        .getPublicUrl(fileName);

      setModal(prev => ({
        ...prev,
        data: { ...prev.data, icon_url: publicUrl }
      }));
    } catch (error) {
      console.error('Error uploading icon:', error);
      setModal(prev => ({ 
        ...prev, 
        error: 'Failed to upload icon image' 
      }));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">充值设置</h1>
        <p className="text-gray-600 dark:text-gray-400">管理金币充值套餐</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setModal({ 
              isOpen: true, 
              type: 'create', 
              data: {
                price_usd: 0,
                coin_amount: 0,
                bonus_coins: 0,
                is_active: true,
                sort_order: packages.length,
                icon_url: ''
              },
              loading: false,
              error: ''
            })}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            新增套餐
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
                  <th className="text-left py-3 px-4">图标</th>
                  <th className="text-left py-3 px-4">美元价格（$）</th>
                  <th className="text-left py-3 px-4">获得金币</th>
                  <th className="text-left py-3 px-4">赠送金币</th>
                  <th className="text-left py-3 px-4">是否启用</th>
                  <th className="text-left py-3 px-4">显示顺序</th>
                  <th className="text-left py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {packages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  packages.map((pkg) => (
                    <tr key={pkg.id} className="border-b dark:border-gray-700">
                      <td className="py-3 px-4">
                        {pkg.icon_url ? (
                          <img src={pkg.icon_url} alt="Package Icon" className="w-10 h-10 object-contain" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                          {pkg.price_usd.toFixed(2)}
                        </div>
                      </td>
                      <td className="py-3 px-4">{pkg.coin_amount}</td>
                      <td className="py-3 px-4">
                        <span className="text-primary-600">+{pkg.bonus_coins}</span>
                      </td>
                      <td className="py-3 px-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={pkg.is_active}
                            onChange={() => handleToggleActive(pkg.id, pkg.is_active)}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                      </td>
                      <td className="py-3 px-4">{pkg.sort_order}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(pkg)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="编辑"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(pkg.id)}
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

      {/* Add/Edit Package Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {modal.type === 'create' ? '新增充值套餐' : '编辑充值套餐'}
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
                <label className="block text-sm font-medium mb-2">美元价格（$）</label>
                <input
                  type="number"
                  step="0.01"
                  value={modal.data.price_usd}
                  onChange={(e) => setModal({ 
                    ...modal, 
                    data: { ...modal.data, price_usd: parseFloat(e.target.value) || 0 } 
                  })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                  min="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">获得金币</label>
                <input
                  type="number"
                  value={modal.data.coin_amount}
                  onChange={(e) => setModal({ 
                    ...modal, 
                    data: { ...modal.data, coin_amount: parseInt(e.target.value) || 0 } 
                  })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">赠送金币</label>
                <input
                  type="number"
                  value={modal.data.bonus_coins}
                  onChange={(e) => setModal({ 
                    ...modal, 
                    data: { ...modal.data, bonus_coins: parseInt(e.target.value) || 0 } 
                  })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">显示顺序</label>
                <input
                  type="number"
                  value={modal.data.sort_order}
                  onChange={(e) => setModal({ 
                    ...modal, 
                    data: { ...modal.data, sort_order: parseInt(e.target.value) || 0 } 
                  })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">图标 URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={modal.data.icon_url}
                    onChange={(e) => setModal({ 
                      ...modal, 
                      data: { ...modal.data, icon_url: e.target.value } 
                    })}
                    className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    placeholder="输入图标URL或上传图片"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Image className="h-5 w-5" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIconUpload}
                    className="hidden"
                  />
                </div>
                {modal.data.icon_url && (
                  <div className="mt-2 flex items-center">
                    <img 
                      src={modal.data.icon_url} 
                      alt="Icon Preview" 
                      className="h-10 w-10 object-contain mr-2" 
                    />
                    <button
                      type="button"
                      onClick={() => setModal({ 
                        ...modal, 
                        data: { ...modal.data, icon_url: '' } 
                      })}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
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
                />
                <label className="text-sm font-medium">是否启用</label>
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
                    '确定'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">确认删除</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              确定要删除这个充值套餐吗？此操作无法撤销。
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
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCoinSettings;
