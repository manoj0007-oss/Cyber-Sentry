import { ReactNode, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Terminal, Network, Brain } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [now, setNow] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Cyberpunk background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyber-primary/5 rounded-full blur-3xl animate-pulse-primary"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyber-accent/5 rounded-full blur-3xl animate-pulse-primary delay-1000"></div>
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-cyber-secondary/5 rounded-full blur-3xl animate-pulse-secondary"></div>
        {/* Subtle scanlines overlay */}
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)`,
            backgroundSize: '100% 3px'
          }}
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 glass-panel border-b border-cyber-accent/20 p-4"
      >
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-cyber-primary animate-pulse-primary" />
              <div>
                <h1 className="font-header text-xl text-cyber-primary font-bold">
                  CyberSentry
                </h1>
                <p className="text-xs text-cyber-accent">
                  Interactive Command Center
                </p>
              </div>
            </div>
            
            {/* Status indicators */}
            <div className="flex items-center gap-4 ml-8">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyber-accent" />
                <span className="text-xs text-muted-foreground">Terminal</span>
                <div className="w-2 h-2 bg-cyber-primary rounded-full animate-pulse-primary"></div>
              </div>
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-cyber-accent" />
                <span className="text-xs text-muted-foreground">Network</span>
                <div className="w-2 h-2 bg-cyber-primary rounded-full animate-pulse-primary"></div>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyber-accent" />
                <span className="text-xs text-muted-foreground">AI</span>
                <div className="w-2 h-2 bg-cyber-primary rounded-full animate-pulse-primary"></div>
              </div>
            </div>
          </div>

          {/* System time */}
          <div className="text-right">
            <div className="text-xs text-muted-foreground">System Time</div>
            <div className="font-mono text-sm text-cyber-accent">{now}</div>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="relative z-10 container mx-auto p-4 flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="z-0 glass-panel border-t border-cyber-accent/20 p-2">
        <div className="container mx-auto text-center">
          <p className="text-xs text-muted-foreground">CyberSentry V2 © Void {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
};