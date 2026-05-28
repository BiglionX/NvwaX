'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import { AiSearchProvider, useAiSearch } from '@/contexts/AiSearchContext';
import AiSearchPanel from '@/components/Marketplace/AiSearchPanel';

/**
 * 内部组件：在 AiSearchProvider 内部使用 useAiSearch hook 并渲染 AiSearchPanel
 */
function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/' || pathname === '/en';
  const { isOpen, initialMessage, onAutoGenerate, closeAiSearch } = useAiSearch();

  return (
    <div className={`min-h-screen flex flex-col ${isHome ? 'bg-transparent' : 'bg-gray-50 dark:bg-gray-900'}`}>
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />

      {/* 全局 AI 搜索面板 */}
      <AiSearchPanel
        isOpen={isOpen}
        onClose={closeAiSearch}
        initialMessage={initialMessage}
        onAutoGenerate={onAutoGenerate}
      />
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AiSearchProvider>
      <LayoutContent>{children}</LayoutContent>
    </AiSearchProvider>
  );
}
