'use client';

import { useState } from 'react';
import axios from 'axios';

// 从 NEXT_PUBLIC_API_URL 提取后端基础地址
// NEXT_PUBLIC_API_URL 格式: http://host:port/api
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const BACKEND_BASE = (() => {
  try {
    const url = new URL(API_BASE);
    return url.origin; // e.g. http://43.156.133.180:3001
  } catch {
    return 'http://localhost:3001';
  }
})();

export default function TestConnection() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      // 测试健康检查
      const healthResponse = await axios.get(`${BACKEND_BASE}/health`);
      console.log('Health check:', healthResponse.data);
      
      // 测试登录 API
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: '1055603323@qq.com',
        password: '123456'
      });
      
      setResult(`✅ Success!\n\nHealth: ${JSON.stringify(healthResponse.data)}\n\nLogin: ${loginResponse.data.message}\nUser: ${loginResponse.data.data.user.email}`);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: unknown }; request?: unknown; message?: string };
      console.error('Error:', err);
      if (err.response) {
        setResult(`❌ Server Error\nStatus: ${err.response.status}\nData: ${JSON.stringify(err.response.data)}`);
      } else if (err.request) {
        setResult(`❌ Network Error\nNo response received. Check if backend is running.`);
      } else {
        setResult(`❌ Error: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          API Connection Test
        </h1>
        
        <button
          onClick={testAPI}
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test API Connection'}
        </button>
        
        {result && (
          <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
              {result}
            </pre>
          </div>
        )}
        
        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          <p>Expected backend URL: {BACKEND_BASE}</p>
          <p>API Base URL: {API_BASE}</p>
        </div>
      </div>
    </div>
  );
}
