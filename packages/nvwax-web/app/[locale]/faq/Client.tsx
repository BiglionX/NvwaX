'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/src/i18n/navigation';
import { ArrowLeft, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

export default function FAQClient() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const t = useTranslations('faq');

  const faqs: FAQ[] = [
    { category: t('categoryGettingStarted'), question: t('q1'), answer: t('a1') },
    { category: t('categoryGettingStarted'), question: t('q2'), answer: t('a2') },
    { category: t('categoryGettingStarted'), question: t('q3'), answer: t('a3') },
    { category: t('categorySearch'), question: t('q4'), answer: t('a4') },
    { category: t('categorySearch'), question: t('q5'), answer: t('a5') },
    { category: t('categorySearch'), question: t('q6'), answer: t('a6') },
    { category: t('categoryData'), question: t('q7'), answer: t('a7') },
    { category: t('categoryData'), question: t('q8'), answer: t('a8') },
    { category: t('categoryData'), question: t('q9'), answer: t('a9') },
    { category: t('categoryProjects'), question: t('q10'), answer: t('a10') },
    { category: t('categoryProjects'), question: t('q11'), answer: t('a11') },
    { category: t('categoryTech'), question: t('q12', { apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api' }), answer: t('a12', { apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api' }) },
    { category: t('categoryTech'), question: t('q13'), answer: t('a13') },
    { category: t('categoryTech'), question: t('q14'), answer: t('a14') },
    { category: t('categoryTech'), question: t('q15'), answer: t('a15') },
    { category: t('categoryContribute'), question: t('q16'), answer: t('a16') },
    { category: t('categoryContribute'), question: t('q17'), answer: t('a17') },
    { category: t('categoryContribute'), question: t('q18'), answer: t('a18') },
    { category: t('categoryOther'), question: t('q19'), answer: t('a19') },
    { category: t('categoryOther'), question: t('q20'), answer: t('a20') },
    { category: t('categoryOther'), question: t('q21'), answer: t('a21') },
  ];

  // Filter FAQs based on search query
  const filteredFaqs = searchQuery.trim()
    ? faqs.filter(faq => 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  // Group by category
  const groupedFaqs = filteredFaqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>{t('backToHome')}</span>
        </Link>
        
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
            {t('count', { count: faqs.length })}
          </span>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          {t('searchHelp')}
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full px-4 py-3 pl-12 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-gray-900 dark:text-white shadow-sm"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('resultsCount', { count: filteredFaqs.length })}
          </p>
        )}
      </div>

      {/* FAQ List */}
      <div className="space-y-6">
        {Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
          <div key={category}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              {category}
            </h2>
            
            <div className="space-y-3">
              {categoryFaqs.map((faq) => {
                const globalIdx = faqs.findIndex(f => f === faq);
                const isOpen = openIndex === globalIdx;
                
                return (
                  <div 
                    key={globalIdx}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : globalIdx)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-linear-to-r hover:from-blue-50 hover:to-blue-50 dark:hover:from-blue-900/20 dark:hover:to-blue-900/20 transition-all group"
                    >
                      <span className="font-medium text-gray-900 dark:text-white pr-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {faq.question}
                      </span>
                      <span className={`p-2 rounded-lg transition-all ${
                        isOpen 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                      }`}>
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>
                    </button>
                    
                    {isOpen && (
                      <div className="px-6 pb-4 text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-4">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredFaqs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Search size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">{t('noResults')}</p>
          <p className="text-sm mt-2">{t('noResultsHint')}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-linear-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-blue-900/20 rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('ctaTitle')}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {t('ctaDesc')}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a 
              href="https://github.com/BigLionX/NvwaX/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 font-medium"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              {t('submitIssue')}
            </a>
            <Link 
              href="/api/docs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 text-gray-700 dark:text-gray-300 rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 font-medium"
            >
              {t('viewApiDocs')}
            </Link>
            <a 
              href="mailto:1055603323@qq.com"
              className="inline-flex items-center gap-2 px-6 py-3 text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {t('emailContact')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
