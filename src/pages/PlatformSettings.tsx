import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertCircle, Loader2, Save, DollarSign, Percent } from 'lucide-react';

interface PlatformSettings {
  coin_to_usd: number;
  author_share_percent: number;
}

const PlatformSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState<PlatformSettings>({
    coin_to_usd: 0.01,
    author_share_percent: 70
  });

  useEffect(() => {
    checkAdmin();
    fetchSettings();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        navigate('/');
        return;
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/');
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // 使用key字段查询全局设置
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('key', 'global')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // 尝试从value字段解析JSON
        try {
          const jsonValue = JSON.parse(data.value || '{}');
          setSettings({
            coin_to_usd: parseFloat(data.coin_to_usd || jsonValue.coin_to_usd || 0.01),
            author_share_percent: parseInt(data.author_share_percent || jsonValue.author_share_percent || 70)
          });
        } catch (e) {
          // 如果JSON解析失败，使用单独的字段
          setSettings({
            coin_to_usd: parseFloat(data.coin_to_usd || 0.01),
            author_share_percent: parseInt(data.author_share_percent || 70)
          });
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('无法加载平台设置');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // 使用upsert确保记录存在
      const { error: updateError } = await supabase
        .from('platform_settings')
        .upsert([{
          key: 'global', // 使用固定的key作为全局设置的标识
          coin_to_usd: settings.coin_to_usd.toString(),
          author_share_percent: settings.author_share_percent.toString(),
          value: JSON.stringify({
            coin_to_usd: settings.coin_to_usd,
            author_share_percent: settings.author_share_percent
          })
        }]);

      if (updateError) throw updateError;

      setSuccess('设置更新成功');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating settings:', error);
      setError('更新设置失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">平台设置</h1>
        <p className="text-gray-600 dark:text-gray-400">管理全局平台收益设置</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg flex items-center">
            <Save className="h-5 w-5 mr-2" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">金币兑美元汇率</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="number"
                value={settings.coin_to_usd}
                onChange={(e) => setSettings({...settings, coin_to_usd: parseFloat(e.target.value)})}
                step="0.001"
                min="0.001"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
                required
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">1个金币的美元价值</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">作者收益分成</label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="number"
                value={settings.author_share_percent}
                onChange={(e) => setSettings({...settings, author_share_percent: parseInt(e.target.value)})}
                min="1"
                max="100"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
                required
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">分配给作者的收益百分比</p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存设置
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlatformSettings;
