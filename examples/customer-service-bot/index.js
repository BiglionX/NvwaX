/**
 * Customer Service Bot Example
 * 
 * This example demonstrates how to build an intelligent customer service bot
 * using NvwaX SDK. The bot can handle common queries, provide product information,
 * and escalate complex issues to human agents.
 */

require('dotenv').config();
const express = require('express');
const { createClient } = require('@nvwax/sdk');

const app = express();
app.use(express.json());

// Initialize NvwaX client
const client = createClient(process.env.NVWAX_API_KEY, {
  baseURL: 'http://localhost:3001'
});

// Conversation history storage (in production, use a database)
const conversations = new Map();

/**
 * Handle incoming chat messages
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { userId, message, sessionId } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        error: 'userId and message are required'
      });
    }

    // Get or create conversation session
    const sessionKey = sessionId || userId;
    let conversationHistory = conversations.get(sessionKey) || [];

    // Add user message to history
    conversationHistory.push({
      role: 'user',
      content: message
    });

    // Keep only last 10 messages to manage context
    if (conversationHistory.length > 10) {
      conversationHistory = conversationHistory.slice(-10);
    }

    // Send to NvwaX AI
    const response = await client.createChatCompletion({
      model: 'customer-service-team-v1',
      messages: [
        {
          role: 'system',
          content: `You are a helpful customer service representative for our company. 
          Be friendly, professional, and concise. If you don't know the answer, 
          politely ask the user to contact human support.`
        },
        ...conversationHistory
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const assistantMessage = response.choices[0].message.content;

    // Add assistant response to history
    conversationHistory.push({
      role: 'assistant',
      content: assistantMessage
    });

    // Save updated history
    conversations.set(sessionKey, conversationHistory);

    res.json({
      success: true,
      response: assistantMessage,
      sessionId: sessionKey
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process message'
    });
  }
});

/**
 * Get conversation history
 */
app.get('/api/conversation/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const history = conversations.get(sessionId) || [];
  
  res.json({
    success: true,
    history
  });
});

/**
 * Clear conversation history
 */
app.delete('/api/conversation/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  conversations.delete(sessionId);
  
  res.json({
    success: true,
    message: 'Conversation cleared'
  });
});

/**
 * Analyze customer sentiment
 */
app.post('/api/analyze-sentiment', async (req, res) => {
  try {
    const { message } = req.body;

    const response = await client.createChatCompletion({
      model: 'analysis-team-v1',
      messages: [
        {
          role: 'system',
          content: 'Analyze the sentiment of the customer message. Return JSON with sentiment (positive/negative/neutral) and confidence score.'
        },
        {
          role: 'user',
          content: message
        }
      ]
    });

    const analysis = response.choices[0].message.content;
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze sentiment'
    });
  }
});

/**
 * Create support ticket for escalation
 */
app.post('/api/create-ticket', async (req, res) => {
  try {
    const { userId, issue, priority, conversationHistory } = req.body;

    // Generate ticket summary using AI
    const summaryResponse = await client.chat(
      `Summarize this customer issue in 2-3 sentences: ${issue}`
    );

    // In production, save to database
    const ticket = {
      id: `TICKET-${Date.now()}`,
      userId,
      issue,
      priority: priority || 'medium',
      summary: summaryResponse,
      status: 'open',
      createdAt: new Date().toISOString(),
      conversationHistory
    };

    console.log('New ticket created:', ticket);

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Ticket creation error:', error);
    res.status(500).json({
      error: 'Failed to create ticket'
    });
  }
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🤖 Customer Service Bot running on port ${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/chat`);
});

module.exports = app;
