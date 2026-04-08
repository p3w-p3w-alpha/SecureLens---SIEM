import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Trash2, Send, ChevronDown } from 'lucide-react';
import HudFrame from './HudFrame';
import api from '../services/api';

export default function ChatPanel() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (!isAuthenticated) return null;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages); setInput(''); setLoading(true);
    try {
      const history = messages.map(({ role, content }) => ({ role, content }));
      const res = await api.post('/api/v1/chat', { message: text, history });
      setMessages([...newMessages, { role: 'assistant', content: res.data.answer, toolCalled: res.data.toolCalled, dataSnapshot: res.data.dataSnapshot }]);
    } catch { setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error.' }]); }
    finally { setLoading(false); }
  };

  const renderContent = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-ice">$1</strong>')
      .replace(/`(.*?)`/g, '<code class="bg-ice/10 px-1 rounded text-xs text-ice">$1</code>')
      .replace(/^- (.*)/gm, '<li class="ml-3">$1</li>');
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen(!open)}
        title="AI Assistant"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-gradient-to-br from-ice to-ice text-white rounded-full shadow-ice-glow flex items-center justify-center transition-all"
      >
        {open ? <X className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-20 right-6 w-96 h-[500px] z-40 flex flex-col bg-void/95 border border-ghost rounded-2xl shadow-ice-glow overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-ghost bg-void-surface">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-ice" />
                <span className="text-sm font-display font-semibold text-white tracking-wider">SECURELENS AI</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setMessages([])} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Clear chat">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors" title="Close">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e3a5f transparent' }}>
              {messages.length === 0 && (
                <div className="text-center mt-12">
                  <Bot className="w-8 h-8 text-ice/30 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 mb-3 font-mono">Ask about your security data</p>
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-600 font-mono">"Show me failed logins"</p>
                    <p className="text-xs text-gray-600 font-mono">"Top attacking IPs?"</p>
                    <p className="text-xs text-gray-600 font-mono">"Any critical alerts?"</p>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-void-raised border border-ice/20 text-gray-200 text-right'
                      : 'bg-void-surface border border-ghost text-gray-300 text-left'
                  }`}>
                    <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }} />
                    {msg.toolCalled && <div className="mt-1 text-[10px] text-ice/50 font-mono">Tool: {msg.toolCalled}</div>}
                    {msg.dataSnapshot && (
                      <details className="mt-2">
                        <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-ice font-mono transition-colors">View Data</summary>
                        <pre className="mt-1 text-[10px] bg-void border border-ghost rounded p-2 overflow-x-auto max-h-32 overflow-y-auto text-ice/70 font-mono">
                          {JSON.stringify(msg.dataSnapshot, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-void-surface border border-ghost rounded-lg px-4 py-3 flex items-center gap-1.5">
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                      className="w-1.5 h-1.5 rounded-full bg-ice" />
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-ice" />
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      className="w-1.5 h-1.5 rounded-full bg-ice" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-ghost p-3 bg-void-surface">
              <div className="flex gap-2">
                <input type="text" value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  disabled={loading} placeholder="Ask about your security data..."
                  className="flex-1 bg-void-surface border border-ghost rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-ice/50 font-mono disabled:opacity-50" />
                <button onClick={sendMessage} disabled={loading || !input.trim()}
                  className="p-2 rounded-lg bg-ice/20 border border-ice/30 text-ice hover:bg-ice/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
