/**
 * AI Chat Panel Component
 *
 * AI workout assistant with context awareness
 * Shows disclaimer once per session
 */

import { useState, useEffect, useRef } from 'react';
import { aiAPI } from '../lib/api';
import { AI_CONFIG, ERROR_MESSAGES } from '../lib/constants';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import Input from './ui/Input';
import Button from './ui/Button';
import Card from './ui/Card';
import { AISparkleIcon, XIcon } from '../icons';

const AIChatPanel = ({ workoutContext, onClose }) => {
  const { isOnline } = useNetworkStatus();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Check if disclaimer has been shown this session
    const disclaimerShown = sessionStorage.getItem('aiDisclaimerShown');
    if (!disclaimerShown) {
      setShowDisclaimer(true);
    }

    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const acknowledgeDisclaimer = () => {
    sessionStorage.setItem('aiDisclaimerShown', 'true');
    setShowDisclaimer(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    // Validate input length
    if (input.length > AI_CONFIG.maxMessageLength) {
      setError(`Message too long (max ${AI_CONFIG.maxMessageLength} characters)`);
      return;
    }

    // Check network status
    if (!isOnline) {
      setError(ERROR_MESSAGES.network);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setError(null);

    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
    ]);

    setLoading(true);

    try {
      // Prepare context with last 3 sets and last 3 conversation exchanges
      const recentMessages = messages.slice(-AI_CONFIG.contextWindow.conversationHistory * 2);

      const context = {
        workout_name: workoutContext?.workoutName,
        current_exercise: workoutContext?.currentExercise,
        recent_sets: workoutContext?.recentSets?.slice(-AI_CONFIG.contextWindow.recentSets),
        conversation_history: recentMessages,
      };

      const response = await aiAPI.chat(userMessage, context);

      if (response.error) {
        // AI returned error (timeout, rate limit, etc.)
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: ERROR_MESSAGES.aiUnavailable,
            timestamp: new Date().toISOString(),
            isError: true,
          },
        ]);
      } else {
        // Success
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: response.message || response.response,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('AI chat error:', err);
      setError(ERROR_MESSAGES.aiUnavailable);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border shadow-lg flex flex-col h-full max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-light">
        <div className="flex items-center gap-2">
          <AISparkleIcon size={22} color="var(--accent)" strokeWidth={1.5} />
          <div>
            <h3 className="font-display text-lg font-semibold text-text">AI Assistant</h3>
            <p className="text-sm text-text-muted">Ask about your workout</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:bg-bg-alt rounded-lg transition-colors"
            aria-label="Close AI assistant"
          >
            <XIcon size={20} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Disclaimer modal */}
      {showDisclaimer && (
        <div className="absolute inset-0 bg-text/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
          <Card className="max-w-md mx-4 p-6">
            <h4 className="font-display text-lg font-semibold text-text mb-3">AI Assistant Disclaimer</h4>
            <p className="text-sm text-text-muted mb-4 leading-relaxed">
              This AI assistant provides suggestions based on your workout data. It is not a
              substitute for professional coaching or medical advice. Use suggestions cautiously
              and listen to your body. Always prioritize safety and proper form.
            </p>
            <Button
              onClick={acknowledgeDisclaimer}
              variant="primary"
              fullWidth
            >
              I Understand
            </Button>
          </Card>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && !showDisclaimer && (
          <div className="text-center text-text-muted mt-8">
            <p className="font-medium mb-3">Ask me about:</p>
            <ul className="text-sm space-y-2">
              <li>• Rest times between sets</li>
              <li>• Weight progression suggestions</li>
              <li>• Form tips and cues</li>
              <li>• Set and rep recommendations</li>
            </ul>
          </div>
        )}

        {/* Live region for chat messages */}
        <div role="log" aria-live="polite" aria-relevant="additions" className="space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl p-3 ${
                  msg.role === 'user'
                    ? 'bg-accent text-white'
                    : msg.isError
                    ? 'bg-error/10 border border-error text-error'
                    : 'bg-bg-alt text-text border border-border-light'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-bg-alt border border-border-light rounded-xl p-3">
                <div className="flex items-center gap-2 text-text-muted">
                  <div className="animate-pulse">Thinking...</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-error/10 border-t border-error text-error text-sm">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border-light">
        {!isOnline && (
          <div className="mb-2 text-sm text-warning text-center">
            AI assistant unavailable offline
          </div>
        )}
        <div className="flex gap-2">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question..."
            disabled={loading || !isOnline}
            maxLength={AI_CONFIG.maxMessageLength}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim() || !isOnline}
            variant="primary"
          >
            Send
          </Button>
        </div>
        <div className="text-xs text-text-light mt-1.5 text-right">
          {input.length}/{AI_CONFIG.maxMessageLength}
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;
