import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "developer" });
  return {
    title: t("pageTitle"),
    description: t("pageDesc"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDesc"),
    },
    alternates: {
      canonical: "https://nvwax.com/developer",
    },
  };
}

export default async function DeveloperPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "developer" });
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t('h1')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {t('welcome')}
        </p>
      </div>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* Quick Start */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🚀 {t('quickStart')}</h2>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('step1GetKey')}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t.rich('step1Desc', {
            consoleUrl: (chunks) => <a href="https://console.nvwax.com" className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{chunks}</a>
          })}
        </p>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('step2InstallSdk')}</h3>
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6 overflow-x-auto">
          <code className="text-sm text-gray-800 dark:text-gray-200">npm install @nvwax/sdk</code>
        </pre>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('step3FirstRequest')}</h3>
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6 overflow-x-auto">
          <code className="text-sm text-gray-800 dark:text-gray-200">{`import { createClient } from '@nvwax/sdk';

const client = createClient('nvwx_your_api_key');

const response = await client.chat('Hello, NvwaX!');
console.log(response);`}</code>
        </pre>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* 核心产品 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📚 核心产品</h2>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1. Chat Completions API</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-3">{t('products.chatApiDesc')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-3"><strong>{t('products.chatApiEndpoint')}</strong>: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">POST /v1/chat/completions</code></p>
          <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4 overflow-x-auto">
            <code className="text-sm text-gray-800 dark:text-gray-200">{`const response = await client.createChatCompletion({
  model: 'marketing-team-v1',
  messages: [
    { role: 'user', content: 'How to improve conversion rates?' }
  ],
  temperature: 0.7
});`}</code>
          </pre>
          <Link href="/docs/api/chat-completions" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">{t('products.chatApiDocs')} →</Link>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2. Agent Marketplace Web Component</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-3">{t('products.marketplaceDesc')}</p>
          <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4 overflow-x-auto">
            <code className="text-sm text-gray-800 dark:text-gray-200">{`<nvwax-agent-marketplace 
  api-key="your-api-key"
  base-url="https://api.nvwax.com">
</nvwax-agent-marketplace>`}</code>
          </pre>
          <Link href="/docs/components/agent-marketplace" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">{t('products.marketplaceDocs')} →</Link>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">3. Agent Studio</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-3">{t('products.studioDesc')}</p>
          <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4 overflow-x-auto">
            <code className="text-sm text-gray-800 dark:text-gray-200">{`<nvwax-agent-studio 
  api-key="your-api-key"
  base-url="https://studio.nvwax.com">
</nvwax-agent-studio>`}</code>
          </pre>
          <Link href="/docs/components/agent-studio" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">{t('products.studioDocs')} →</Link>
        </div>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* SDK & Tools */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('sdkTools')}</h2>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('jsSdk')}</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 ml-4 mb-4">
            <li><strong>{t('jsSdkPackage')}</strong>: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">@nvwax/sdk</code></li>
            <li><strong>{t('jsSdkEnv')}</strong>: Node.js 14+, Modern Browsers</li>
            <li><strong>{t('jsSdkFeatures')}</strong>: Chat API, API Key Management, Usage Stats</li>
          </ul>
          <Link href="/docs/sdk/javascript" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">{t('jsSdkInstall')} →</Link>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('webComponents')}</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 ml-4 mb-4">
            <li><strong>{t('webComponentsAgentMarketplace')}</strong>: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">@nvwax/agent-marketplace</code></li>
            <li><strong>{t('webComponentsAgentStudio')}</strong>: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">@nvwax/agent-studio</code></li>
            <li><strong>{t('webComponentsFramework')}</strong>: React, Vue, Angular, Vanilla JS</li>
          </ul>
          <Link href="/docs/components" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">{t('webComponentsDocs')} →</Link>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('apiClients')}</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 ml-4">
            <li>{t('apiClientPython')}</li>
            <li>{t('apiClientGo')}</li>
            <li>{t('apiClientJava')}</li>
          </ul>
        </div>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* API Reference */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📖 {t('apiRef')}</h2>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('auth')}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-3">{t('authDesc')}</p>
          <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6 overflow-x-auto">
            <code className="text-sm text-gray-800 dark:text-gray-200">Authorization: Bearer nvwx_your_api_key</code>
          </pre>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('rateLimit')}</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('plan')}</th>
                  <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('requestsPerHour')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400">{t('tierFree')}</td>
                  <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400">1,000</td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400">{t('tierPro')}</td>
                  <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400">50,000</td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400">{t('tierEnterprise')}</td>
                  <td className="py-2 px-4 text-sm text-gray-600 dark:text-gray-400">{t('unlimited')}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-3">{t.rich('rateLimitDesc', { code: () => <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">429 Too Many Requests</code> })}</p>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('errorCodes')}</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('errorCode')}</th>
                  <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('errorDesc')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">400</td><td className="py-2 px-4 text-sm text-gray-600">{t('error400')}</td></tr>
                <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">401</td><td className="py-2 px-4 text-sm text-gray-600">{t('error401')}</td></tr>
                <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">403</td><td className="py-2 px-4 text-sm text-gray-600">{t('error403')}</td></tr>
                <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">429</td><td className="py-2 px-4 text-sm text-gray-600">{t('error429')}</td></tr>
                <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">500</td><td className="py-2 px-4 text-sm text-gray-600">{t('error500')}</td></tr>
              </tbody>
            </table>
          </div>
          <Link href="/docs/api-reference" className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-4 inline-block">{t('fullApiRef')} →</Link>
        </div>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">💡 {t('examples')}</h2>
        
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {[
            { titleKey: 'exampleCustomerBot', descKey: 'exampleCustomerBotDesc', href: "/examples/customer-service-bot" },
            { titleKey: 'exampleMarketing', descKey: 'exampleMarketingDesc', href: "/examples/marketing-content-generator" },
            { titleKey: 'exampleDataAnalysis', descKey: 'exampleDataAnalysisDesc', href: "/examples/data-analysis-assistant" },
            { titleKey: 'exampleCodeReview', descKey: 'exampleCodeReviewDesc', href: "/examples/code-review-assistant" },
          ].map((item) => (
            <Link key={item.titleKey} href={item.href} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t(item.titleKey)}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t(item.descKey)}</p>
            </Link>
          ))}
        </div>
        <Link href="/examples" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">{t('moreExamples')} →</Link>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* Developer Tools */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🔧 {t('devTools')}</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { titleKey: 'toolPlayground', descKey: 'toolPlaygroundDesc', href: "/playground" },
            { titleKey: 'toolWebhook', descKey: 'toolWebhookDesc', href: "/webhook-debugger" },
            { titleKey: 'toolSdkGenerator', descKey: 'toolSdkGeneratorDesc', href: "/sdk-generator" },
          ].map((item) => (
            <Link key={item.titleKey} href={item.href} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t(item.titleKey)}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t(item.descKey)}</p>
            </Link>
          ))}
        </div>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* Billing & Quotas */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📊 {t('billing')}</h2>
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('plan')}</th>
                <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('pricing')}</th>
                <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('tokenQuota')}</th>
                <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('features')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">{t('tierFree')}</td><td className="py-2 px-4 text-sm text-gray-600">{t('tierFreePrice')}</td><td className="py-2 px-4 text-sm text-gray-600">{t('tierFreeQuota')}</td><td className="py-2 px-4 text-sm text-gray-600">{t('tierFreeFeatures')}</td></tr>
              <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">{t('tierPro')}</td><td className="py-2 px-4 text-sm text-gray-600">{t('tierProPrice')}</td><td className="py-2 px-4 text-sm text-gray-600">{t('tierProQuota')}</td><td className="py-2 px-4 text-sm text-gray-600">{t('tierProFeatures')}</td></tr>
              <tr className="border-b border-gray-200 dark:border-gray-700"><td className="py-2 px-4 text-sm text-gray-600">{t('tierEnterprise')}</td><td className="py-2 px-4 text-sm text-gray-600">{t('tierEnterprisePrice')}</td><td className="py-2 px-4 text-sm text-gray-600">{t('tierEnterpriseQuota')}</td><td className="py-2 px-4 text-sm text-gray-600">{t('tierEnterpriseFeatures')}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-3">{t('billingDesc')}</p>
        <a href="https://console.nvwax.com/usage" className="text-blue-600 dark:text-blue-400 hover:underline text-sm" target="_blank" rel="noopener noreferrer">{t('viewConsole')} →</a>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* Learning */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🎓 {t('learning')}</h2>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('tutorials')}</h3>
          <ul className="space-y-2">
            {[
              { key: 'tutorialQuickStart', href: "/tutorials/quick-start" },
              { key: 'tutorialBuildAgent', href: "/tutorials/build-first-agent" },
              { key: 'tutorialReact', href: "/tutorials/react-integration" },
              { key: 'tutorialWebhook', href: "/tutorials/webhook-best-practices" },
            ].map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">{t(item.key)}</Link>
              </li>
            ))}
          </ul>
        </div>
        <Link href="/tutorials" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">{t('allTutorials')} →</Link>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* Community */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🤝 {t('community')}</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <a href="https://discord.gg/nvwax" target="_blank" rel="noopener noreferrer" className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t('discord')}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('discordDesc')}</p>
          </a>
          <a href="https://github.com/BigLionX/NvwaX" target="_blank" rel="noopener noreferrer" className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t('github')}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('githubDesc')}</p>
          </a>
          <a href="https://console.nvwax.com/support" target="_blank" rel="noopener noreferrer" className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t('support')}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('supportDesc')}</p>
          </a>
        </div>
        <details className="mb-4">
          <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">{t('responseTime')}</summary>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400 ml-4 mt-2">
            <li>{t('responseFree')}</li>
            <li>{t('responsePro')}</li>
            <li>{t('responseEnterprise')}</li>
          </ul>
        </details>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* Changelog */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📢 {t('changelog')}</h2>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('changelogTitle')}</h3>
        <ul className="space-y-1 text-gray-600 dark:text-gray-400 ml-4 mb-4">
          <li>{t('changelogItem1')}</li>
          <li>{t('changelogItem2')}</li>
          <li>{t('changelogItem3')}</li>
          <li>{t('changelogItem4')}</li>
          <li>{t('changelogItem5')}</li>
          <li>{t('changelogItem6')}</li>
        </ul>
        <Link href="/changelog" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">{t('fullChangelog')} →</Link>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">❓ {t('faqSection')}</h2>
        <div className="space-y-6">
          {[
            { qKey: 'faq1Q', aKey: 'faq1A' },
            { qKey: 'faq2Q', aKey: 'faq2A' },
            { qKey: 'faq3Q', aKey: 'faq3A' },
            { qKey: 'faq4Q', aKey: 'faq4A' },
          ].map((faq) => (
            <div key={faq.qKey}>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{t(faq.qKey)}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t(faq.aKey)}</p>
            </div>
          ))}
        </div>
        <Link href="/faq" className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-4 inline-block">{t('moreFaq')} →</Link>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-12" />

      {/* Contact */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📞 {t('contact')}</h2>
        <ul className="space-y-2 text-gray-600 dark:text-gray-400">
          <li><strong>{t('contactSales')}</strong>: sales@nvwax.com</li>
          <li><strong>{t('contactSupport')}</strong>: support@nvwax.com</li>
          <li><strong>{t('contactPartnerships')}</strong>: partnerships@nvwax.com</li>
        </ul>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-8" />

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 dark:text-gray-500">
        <p className="mb-2">{t('footer')}</p>
        <div className="flex justify-center gap-4">
          <Link href="/privacy" className="hover:underline">{t('privacy')}</Link>
          <Link href="/terms" className="hover:underline">{t('terms')}</Link>
          <a href="https://status.nvwax.com" className="hover:underline" target="_blank" rel="noopener noreferrer">{t('statusPage')}</a>
        </div>
      </footer>
    </div>
  );
}
