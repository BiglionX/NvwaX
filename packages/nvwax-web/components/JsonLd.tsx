import { type JSX } from 'react';

/**
 * JSON-LD 结构化数据注入组件
 *
 * 服务端组件与客户端组件均可使用；渲染为
 * <script type="application/ld+json">...</script>
 *
 * 用法：
 *   import JsonLd from '@/components/JsonLd';
 *   <JsonLd data={faqJsonLd(faqItems)} />
 */
export default function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}): JSX.Element {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
