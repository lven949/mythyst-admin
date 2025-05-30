import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowUpDown, Calendar, Search, Download, Filter, Loader2 } from 'lucide-react';

interface CoinTransaction {
  id: string;
  amount: number;
  type: 'recharge' | 'unlock' | 'gift' | 'system';
  description: string;
  created_at: string;
  user: {
    username: string;
  };
}

const typeLabels: Record<string, string> = {
  recharge: '充值',
  unlock: '解锁',
  gift: '打赏',
  system: '系统赠送'
};

const typeColors: Record<string, string> = {
  recharge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  unlock: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  gift: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  system: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
};

const AdminCoins = () => {
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [sortField, setSortField] = useState<'created_at' | 'amount'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [exporting, setExporting] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, searchTerm, typeFilter, dateRange, sortField, sortOrder]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // First get total count for pagination
      let countQuery = supabase
        .from('coin_transactions')
        .select('id', { count: 'exact', head: true });

      if (searchTerm) {
        countQuery = countQuery.textSearch('description', searchTerm);
      }

      if (typeFilter !== 'all') {
        countQuery = countQuery.eq('type', typeFilter);
      }

      if (dateRange.start) {
        countQuery = countQuery.gte('created_at', dateRange.start);
      }

      if (dateRange.end) {
        countQuery = countQuery.lte('created_at', dateRange.end);
      }

      const { count, error: countError } = await countQuery;
      
      if (countError) throw countError;
      
      setTotalRecords(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      
      // Now fetch the actual data with pagination
      let query = supabase
        .from('coin_transactions')
        .select(`
          id,
          amount,
          type,
          description,
          created_at,
          user:user_profiles!inner(username)
        `)
        .order(sortField, { ascending: sortOrder === 'asc' })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (searchTerm) {
        query = query.or(`description.ilike.%${searchTerm}%,user_profiles.username.ilike.%${searchTerm}%`);
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }

      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatAmount = (amount: number) => {
    return amount >= 0 ? `+${amount}` : amount.toString();
  };

  const exportToCSV = async () => {
    try {
      setExporting(true);
      
      // Fetch all data for export (no pagination)
      let query = supabase
        .from('coin_transactions')
        .select(`
          id,
          amount,
          type,
          description,
          created_at,
          user:user_profiles!inner(username)
        `)
        .order(sortField, { ascending: sortOrder === 'asc' });

      if (searchTerm) {
        query = query.or(`description.ilike.%${searchTerm}%,user_profiles.username.ilike.%${searchTerm}%`);
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }

      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Format data for CSV
      const csvData = data?.map(transaction => ({
        Username: transaction.user.username,
        Amount: transaction.amount,
        Type: typeLabels[transaction.type] || transaction.type,
        Description: transaction.description,
        'Transaction Date': new Date(transaction.created_at).toLocaleString()
      }));
      
      // Convert to CSV
      const headers = Object.keys(csvData?.[0] || {}).join(',');
      const rows = csvData?.map(row => Object.values(row).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(','));
      
      const csv = [headers, ...(rows || [])].join('\n');
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `coin_transactions_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">金币流水</h1>
        <p className="text-gray-600 dark:text-gray-400">查看所有金币交易记录</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索用户名或交易描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">全部类型</option>
              <option value="recharge">充值</option>
              <option value="unlock">解锁</option>
              <option value="gift">打赏</option>
              <option value="system">系统赠送</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <span>至</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <button
            onClick={exportToCSV}
            disabled={exporting || transactions.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            导出CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4">用户名</th>
                <th className="text-left py-3 px-4 cursor-pointer" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center">
                    金币变动数额
                    <ArrowUpDown className={`ml-1 h-4 w-4 ${sortField === 'amount' ? 'text-primary-500' : ''}`} />
                  </div>
                </th>
                <th className="text-left py-3 px-4">类型</th>
                <th className="text-left py-3 px-4">备注说明</th>
                <th className="text-left py-3 px-4 cursor-pointer" onClick={() => toggleSort('created_at')}>
                  <div className="flex items-center">
                    交易时间
                    <ArrowUpDown className={`ml-1 h-4 w-4 ${sortField === 'created_at' ? 'text-primary-500' : ''}`} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="mt-2 text-gray-500">加载中...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b dark:border-gray-700">
                    <td className="py-3 px-4">{transaction.user.username}</td>
                    <td className="py-3 px-4">
                      <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatAmount(transaction.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-sm ${typeColors[transaction.type] || ''}`}>
                        {typeLabels[transaction.type] || transaction.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">{transaction.description}</td>
                    <td className="py-3 px-4">
                      {new Date(transaction.created_at).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            共 {totalRecords} 条记录，当前显示 {transactions.length} 条
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

export default AdminCoins;