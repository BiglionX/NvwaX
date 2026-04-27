'use client';

import { useState } from 'react';
import { createClient } from '@nvwax/sdk';

const client = createClient(process.env.NEXT_PUBLIC_NVWAX_API_KEY || '', {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
});

export default function Home() {
  const [contentType, setContentType] = useState('blog');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const contentTypes = [
    { value: 'blog', label: 'Blog Post', icon: '📝' },
    { value: 'social', label: 'Social Media Post', icon: '📱' },
    { value: 'email', label: 'Email Campaign', icon: '📧' },
    { value: 'ad', label: 'Ad Copy', icon: '🎯' }
  ];

  const tones = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'enthusiastic', label: 'Enthusiastic' },
    { value: 'humorous', label: 'Humorous' }
  ];

  const lengths = [
    { value: 'short', label: 'Short (100-200 words)' },
    { value: 'medium', label: 'Medium (300-500 words)' },
    { value: 'long', label: 'Long (600-1000 words)' }
  ];

  const generateContent = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedContent('');

    try {
      let prompt = '';
      
      switch (contentType) {
        case 'blog':
          prompt = `Write a ${length} ${tone} blog post about: ${topic}. 
          Include an engaging introduction, main points with examples, and a compelling conclusion.`;
          break;
        case 'social':
          prompt = `Create a ${tone} social media post about: ${topic}. 
          Make it engaging and include relevant hashtags.`;
          break;
        case 'email':
          prompt = `Write a ${tone} marketing email about: ${topic}. 
          Include a catchy subject line, compelling body, and clear call-to-action.`;
          break;
        case 'ad':
          prompt = `Create ${tone} ad copy for: ${topic}. 
          Write 3 different versions with headlines and descriptions.`;
          break;
      }

      const response = await client.createChatCompletion({
        model: 'marketing-team-v1',
        messages: [
          {
            role: 'system',
            content: 'You are an expert marketing content creator. Create high-quality, engaging content that drives conversions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: length === 'short' ? 300 : length === 'medium' ? 600 : 1200
      });

      setGeneratedContent(response.choices[0].message.content);
    } catch (err) {
      console.error('Generation error:', err);
      setError('Failed to generate content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    alert('Content copied to clipboard!');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>
        🚀 Marketing Content Generator
      </h1>
      <p style={{ color: '#666', marginBottom: '40px' }}>
        Generate high-quality marketing content with AI
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        {/* Input Section */}
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Content Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {contentTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setContentType(type.value)}
                  style={{
                    padding: '12px',
                    border: contentType === type.value ? '2px solid #6366f1' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: contentType === type.value ? '#f0f0ff' : 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {type.icon} {type.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Topic / Product
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Our new AI-powered analytics platform"
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                {tones.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Length
              </label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                {lengths.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px',
              background: '#fee2e2',
              color: '#dc2626',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <button
            onClick={generateContent}
            disabled={loading || !topic.trim()}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#9ca3af' : '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Generating...' : '✨ Generate Content'}
          </button>
        </div>

        {/* Output Section */}
        <div>
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px',
            minHeight: '400px',
            background: '#fafafa'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ margin: 0 }}>Generated Content</h3>
              {generatedContent && (
                <button
                  onClick={copyToClipboard}
                  style={{
                    padding: '8px 16px',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📋 Copy
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #e5e7eb',
                  borderTopColor: '#6366f1',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }}></div>
                <p>Creating amazing content...</p>
              </div>
            ) : generatedContent ? (
              <div style={{
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                color: '#1f2937'
              }}>
                {generatedContent}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#9ca3af'
              }}>
                <p style={{ fontSize: '48px', margin: '0 0 16px' }}>📝</p>
                <p>Your generated content will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
