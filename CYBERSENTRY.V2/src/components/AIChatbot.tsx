import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNetworkStore } from '@/store/networkStore';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  text: string;
  timestamp: Date;
}

export const AIChatbot = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      text: '🤖 CyberSentry AI Analyst online. I\'m here to help analyze threats and provide security insights.',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const { simulationActive, alerts, threatIntel } = useNetworkStore();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle chat events from socket (auto-messages during simulation)
  const handleChatEvent = (data: { text: string; type?: string }) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'ai',
      text: data.text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    setIsExpanded(true); // Auto-expand when AI sends messages
  };

  // Expose handler for socket events
  useEffect(() => {
    (window as any).handleChatEvent = handleChatEvent;
  }, []);

  // Auto-send analysis when simulation events occur
  useEffect(() => {
    if (simulationActive && alerts.length > 0) {
      const latestAlert = alerts[0];
      if (latestAlert.level === 'critical') {
        setTimeout(() => {
          handleChatEvent({
            text: `🔍 **Threat Analysis**: A decoy system has been engaged. The attacker appears to be conducting lateral movement. This is exactly what our deception technology is designed to catch. The real systems remain protected.`
          });
        }, 2000);
      } else if (latestAlert.level === 'success') {
        setTimeout(() => {
          handleChatEvent({
            text: `✅ **Containment Successful**: The attacker has been successfully contained within our deceptive environment. Zero real assets were compromised. This demonstrates the effectiveness of our cyber deception strategy.`
          });
        }, 1500);
      }
    }
  }, [alerts, simulationActive]);

  const simulateAIResponse = async (userMessage: string) => {
    setIsTyping(true);
    try {
      // Use direct backend URL instead of relative path
      const backendUrl = `http://${window.location.hostname}:3001/api/chat`;
      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'ai', text: data.text, timestamp: new Date() }]);
    } catch (e) {
      console.error('Chat API error:', e);
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'ai', text: 'AI is temporarily unavailable. Please try again shortly.', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    simulateAIResponse(inputText);
    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isExpanded) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setIsExpanded(true)}
          variant="cyber-accent"
          size="icon"
          className="rounded-full w-14 h-14 shadow-lg"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      className="fixed bottom-6 right-6 w-80 h-96 z-50"
    >
      <div className="glass-panel h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyber-accent/20">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyber-accent animate-pulse-primary" />
            <span className="font-header text-sm text-cyber-accent">AI Analyst</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </Button>
        </div>

        {/* Messages */}
        <div 
          ref={messagesRef}
          className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-cyber-accent/20 space-y-3"
        >
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    message.type === 'user'
                      ? 'bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30'
                      : message.type === 'system'
                        ? 'bg-cyber-primary/10 text-cyber-primary border border-cyber-primary/30'
                        : 'bg-glass-bg border border-glass-border text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-glass-bg border border-glass-border p-3 rounded-lg">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-cyber-accent rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-cyber-accent rounded-full animate-pulse delay-100"></div>
                  <div className="w-2 h-2 bg-cyber-accent rounded-full animate-pulse delay-200"></div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-cyber-accent/20">
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask the AI analyst..."
              className="bg-glass-bg border-glass-border text-sm"
            />
            <Button
              onClick={handleSendMessage}
              variant="cyber-accent"
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};