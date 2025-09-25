import { useState, useEffect, useRef } from 'react';
import { socketManager } from '@/lib/socket';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TerminalLine {
  type: 'command' | 'output' | 'alert';
  text: string;
  timestamp: Date;
}

interface TerminalProps {
  className?: string;
}

export const Terminal = ({ className }: TerminalProps) => {
  const [lines, setLines] = useState<TerminalLine[]>([
    { 
      type: 'output', 
      text: '🔮 CyberSentry Live Terminal - READY', 
      timestamp: new Date() 
    },
    { 
      type: 'output', 
      text: '🛡️  Honeypot telemetry online. Streaming live attacker activity...', 
      timestamp: new Date() 
    }
  ]);
  const [currentLine, setCurrentLine] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines, currentLine]);

  // DRAMATIC TYPEWRITER EFFECT - Ensures sequencing
  const typewriterEffect = (text: string, speed: number = 25, onComplete?: () => void) => {
    setIsTyping(true);
    setCurrentLine('');
    
    let index = 0;
    const timer = setInterval(() => {
      if (index <= text.length) {
        setCurrentLine(text.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
        onComplete?.();
      }
    }, speed); // Variable typing speed for dramatic effect

    return () => clearInterval(timer);
  };

  // SYNCHRONIZED EVENT HANDLER - Responds immediately to backend conductor
  const handleTerminalEvent = (() => {
    // Internal FIFO queue to enforce command→output order
    const queue: Array<{ type: string; text: string; duration?: number }> = [];
    let running = false;

    const runNext = () => {
      if (running || queue.length === 0) return;
      running = true;
      const data = queue.shift()!;

      const newLine: TerminalLine = {
        type: data.type as TerminalLine['type'],
        text: data.text,
        timestamp: new Date()
      };

      if (data.type === 'command') {
        // Type commands character-by-character
        typewriterEffect(data.text, data.duration || 20, () => {
          setLines(prev => [...prev, newLine]);
          setCurrentLine('');
          running = false;
          // Small pause before next event to simulate think time
          setTimeout(runNext, 100);
        });
      } else if (data.type === 'alert') {
        setTimeout(() => {
          setLines(prev => [...prev, newLine]);
          running = false;
          setTimeout(runNext, 50);
        }, 100);
      } else {
        // Outputs: slight delay, then smooth typing
        setTimeout(() => {
          typewriterEffect(data.text, data.duration || 30, () => {
            setLines(prev => [...prev, newLine]);
            setCurrentLine('');
            running = false;
            setTimeout(runNext, 100);
          });
        }, 100);
      }
    };

    return (data: { type: string; text: string; duration?: number }) => {
      // Mask password prompts
      if (/password:/i.test(data.text)) {
        data = { ...data, text: data.text.replace(/password:.*/i, 'password: ********') };
      }
      queue.push(data);
      runNext();
    };
  })();

  // Expose the handler for socket events
  useEffect(() => {
    (window as any).handleTerminalEvent = handleTerminalEvent;
  }, []);

  // Subscribe directly to socket events to ensure delivery
  useEffect(() => {
    const socket = socketManager.getSocket();
    const onData = (data: any) => handleTerminalEvent(data);
    socket.on('terminal:data', onData);
    return () => {
      socket.off('terminal:data', onData);
    };
  }, []);

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command':
        return 'text-cyber-accent';
      case 'alert':
        return 'text-cyber-danger font-bold animate-glitch';
      default:
        return 'text-foreground';
    }
  };

  const getLinePrefix = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command':
        return '$ ';
      case 'alert':
        return '⚠️  ';
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('terminal-screen h-full', className)}
    >
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-cyber-accent/20">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyber-danger animate-pulse-danger"></div>
          <div className="w-3 h-3 rounded-full bg-cyber-secondary animate-pulse-secondary"></div>
          <div className="w-3 h-3 rounded-full bg-cyber-primary animate-pulse-primary"></div>
          <span className="font-header text-sm text-cyber-accent ml-2">
            COMMAND TERMINAL
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div 
        ref={terminalRef}
        className="h-full overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-cyber-accent/20"
        style={{ maxHeight: 'calc(100% - 60px)' }}
      >
        {lines.map((line, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'mb-2 leading-relaxed',
              getLineColor(line.type)
            )}
          >
            <span className="text-muted-foreground text-xs mr-2">
              {line.timestamp.toLocaleTimeString()}
            </span>
            <span className="text-cyber-accent">
              {getLinePrefix(line.type)}
            </span>
            <span className="whitespace-pre-wrap">
              {line.text}
            </span>
          </motion.div>
        ))}

        {/* Current typing line */}
        {isTyping && (
          <div className="mb-2 leading-relaxed text-cyber-accent">
            <span className="text-muted-foreground text-xs mr-2">
              {new Date().toLocaleTimeString()}
            </span>
            <span className="text-cyber-accent">$ </span>
            <span className="whitespace-pre-wrap">
              {currentLine}
            </span>
            <span className="animate-blink border-r-2 border-cyber-accent ml-1">
              &nbsp;
            </span>
          </div>
        )}

        {/* Cursor when not typing */}
        {!isTyping && (
          <div className="mb-2 leading-relaxed text-cyber-accent">
            <span className="text-muted-foreground text-xs mr-2">
              {new Date().toLocaleTimeString()}
            </span>
            <span className="text-cyber-accent">$ </span>
            <span className="animate-blink border-r-2 border-cyber-accent">
              &nbsp;
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};