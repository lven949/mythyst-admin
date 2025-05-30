import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Clock, 
  CreditCard, 
  Wallet, 
  Loader2, 
  Check, 
  AlertCircle,
  X,
  DollarSign
} from 'lucide-react';

interface WithdrawRequest {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  author: {
    id: string;
    username: string;
    author_payment_accounts: {
      account_type: string;
      account_name: string;
      account_id: string; // Changed from account_number to account_id to match DB schema
    } | null;
  };
}

interface PaymentModal {
  isOpen: boolean;
  requestId: string | null;
  data: {
    payment_method: string;
    payment_reference: string;
  };
}

const WithdrawReview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [modal, setModal] = useState<PaymentModal>({
    isOpen: false,
    requestId: null,
    data: { payment_method: '', payment_reference: '' }
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchRequests();
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

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('withdraw_requests')
        .select(`
          *,
          author:user_profiles(
            id,
            username,
            author_payment_accounts(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching withdraw requests:', error);
      setError('加载提现请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      setSubmitting(true);
      if (!modal.requestId) throw new Error('未选择提现请求');

      const { error: updateError } = await supabase
        .from('withdraw_requests')
        .update({
          paid_at: new Date().toISOString(),
          payment_method: modal.data.payment_method,
          payment_reference: modal.data.payment_reference
        })
        .eq('id', modal.requestId);

      if (updateError) throw updateError;

      setModal({ isOpen: false, requestId: null, data: { payment_method: '', payment_reference: '' } });
      fetchRequests();
    } catch (error) {
      console.error('Error marking request as paid:', error);
      setError('更新支付状态失败');
    } finally {
      setSubmitting(false);
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
        <h1 className="text-2xl font-bold">提现审核</h1>
        <p className="text-gray-600 dark:text-gray-400">审核和处理作者提现请求</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4">作者</th>
                <th className="text-left py-3 px-4">金额</th>
                <th className="text-left py-3 px-4">状态</th>
                <th className="text-left py-3 px-4">支付信息</th>
                <th className="text-left py-3 px-4">申请时间</th>
                <th className="text-left py-3 px-4">支付状态</th>
                <th className="text-left py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-b dark:border-gray-700">
                  <td className="py-3 px-4">{request.author.username}</td>
                  <td className="py-3 px-4">{request.amount} 金币</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      request.status === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : request.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {request.status === 'approved' ? '已批准' : 
                       request.status === 'pending' ? '待审核' : '已拒绝'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <p>类型: {request.author.author_payment_accounts?.[0]?.account_type || '未设置'}</p>
                      <p className="text-gray-500">
                        {request.author.author_payment_accounts?.[0]?.account_id 
                          ? '****' + request.author.author_payment_accounts[0].account_id.slice(-4) 
                          : '未设置'}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {new Date(request.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="py-3 px-4">
                    {request.paid_at ? (
                      <div className="text-sm">
                        <div className="flex items-center text-green-600">
                          <Check className="w-4 h-4 mr-1" />
                          已支付
                        </div>
                        <p className="text-gray-500">
                          {request.payment_method} - {request.payment_reference}
                        </p>
                      </div>
                    ) : request.status === 'approved' ? (
                      <span className="text-yellow-600">待支付</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {request.status === 'approved' && !request.paid_at && (
                      <button
                        onClick={() => setModal({
                          isOpen: true,
                          requestId: request.id,
                          data: { payment_method: '', payment_reference: '' }
                        })}
                        className="flex items-center text-primary-600 hover:text-primary-700"
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        标记为已支付
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {requests.length === 0 && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">暂无提现请求</p>
          </div>
        )}
      </div>

      {/* 支付确认模态框 */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">确认支付</h2>
              <button
                onClick={() => setModal({ isOpen: false, requestId: null, data: { payment_method: '', payment_reference: '' } })}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">支付方式</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={modal.data.payment_method}
                    onChange={(e) => setModal(prev => ({
                      ...prev,
                      data: { ...prev.data, payment_method: e.target.value }
                    }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
                    placeholder="例如：支付宝、银行转账"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">支付参考号</label>
                <input
                  type="text"
                  value={modal.data.payment_reference}
                  onChange={(e) => setModal(prev => ({
                    ...prev,
                    data: { ...prev.data, payment_reference: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700"
                  placeholder="交易ID或参考号"
                  required
                />
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setModal({ isOpen: false, requestId: null, data: { payment_method: '', payment_reference: '' } })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={handlePaymentSuccess}
                  disabled={submitting || !modal.data.payment_method || !modal.data.payment_reference}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    '确认支付'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawReview;
