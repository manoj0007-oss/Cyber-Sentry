import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { Globe, Users, Target, TrendingUp } from 'lucide-react';

export const ThreatIntelPanel = () => {
  const store = useNetworkStore();
  const [intel, setIntel] = useState<{ [k: string]: any }>({});

  // Start empty; incrementally populate via socket events
  useEffect(() => {
    (window as any).handleThreatIntelUpdate = (data: any) => {
      setIntel(prev => ({ ...prev, [data.property]: data.value, ...(data.confidence !== undefined ? { confidence: data.confidence } : {}) }));
      // Also reflect into the global store for other consumers
      store.updateThreatIntel({ [data.property]: data.value, ...(data.confidence !== undefined ? { confidence: data.confidence } : {}) } as any);
    };
    (window as any).handleAttackStart = (data: any) => {
      // Set source IP immediately for actor identification
      setIntel(prev => ({ ...prev, sourceIp: data.src_ip }));
      store.updateThreatIntel({ sourceIp: data.src_ip } as any);
    };
    // Flush any buffered intel events that arrived before handler bound
    const w = window as any;
    if (w.__threatIntelBuffer && Array.isArray(w.__threatIntelBuffer)) {
      w.__threatIntelBuffer.forEach((evt: any) => (window as any).handleThreatIntelUpdate(evt));
      w.__threatIntelBuffer = [];
    }
    return () => { delete (window as any).handleThreatIntelUpdate; };
  }, []);

  const confidenceColor = (confidence: number = 0) => {
    if (confidence >= 80) return 'text-cyber-danger';
    if (confidence >= 60) return 'text-cyber-secondary';
    if (confidence >= 40) return 'text-cyber-accent';
    return 'text-muted-foreground';
  };

  const confidenceBar = (confidence: number = 0) => {
    if (confidence >= 80) return 'bg-cyber-danger';
    if (confidence >= 60) return 'bg-cyber-secondary';
    if (confidence >= 40) return 'bg-cyber-accent';
    return 'bg-muted';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-4 h-full"
    >
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-cyber-accent/20">
        <Target className="w-5 h-5 text-cyber-danger animate-pulse-danger" />
        <h3 className="font-header text-sm text-cyber-accent">Threat Intelligence</h3>
      </div>

      <div className="space-y-4">
        {/* Source IP */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyber-accent" />
            <span className="text-xs font-medium text-muted-foreground">Source IP</span>
          </div>
          {intel.sourceIp ? (
            <div className="glass-panel p-2">
              <p className="font-mono text-sm text-cyber-danger">
                {intel.sourceIp}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No active threats detected</p>
          )}
        </div>

        {/* Suspected Group */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyber-accent" />
            <span className="text-xs font-medium text-muted-foreground">Threat Actor</span>
          </div>
          {intel.suspectedGroup ? (
            <div className="glass-panel p-2">
              <p className="text-sm font-medium text-cyber-secondary">
                {intel.suspectedGroup}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Unknown threat actor</p>
          )}
        </div>

        {/* Tactic & Technique */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-cyber-accent" />
            <span className="text-xs font-medium text-muted-foreground">Attack Vector</span>
          </div>
          {intel.tactic || intel.technique ? (
            <div className="glass-panel p-2 space-y-1">
              {intel.tactic && (
                <p className="text-sm text-foreground">
                  <span className="text-cyber-accent">Tactic:</span> {intel.tactic}
                </p>
              )}
              {intel.technique && (
                <p className="text-sm text-foreground">
                  <span className="text-cyber-accent">Technique:</span> {intel.technique}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No attack vectors identified</p>
          )}
        </div>

        {/* Confidence Score */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyber-accent" />
            <span className="text-xs font-medium text-muted-foreground">Confidence</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-mono ${confidenceColor(intel.confidence)}`}>
                {intel.confidence || 0}%
              </span>
              <span className="text-xs text-muted-foreground">
                {intel.confidence && intel.confidence >= 80 
                  ? 'HIGH' 
                  : intel.confidence && intel.confidence >= 60
                    ? 'MEDIUM'
                    : intel.confidence && intel.confidence >= 40
                      ? 'LOW'
                      : 'UNKNOWN'
                }
              </span>
            </div>
            <div className="w-full bg-glass-border rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${confidenceBar(intel.confidence)}`}
                style={{ width: `${intel.confidence || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* MITRE ATT&CK Framework Reference */}
        {intel.tactic && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-3 border border-cyber-accent/30"
          >
            <div className="text-xs text-cyber-accent font-medium mb-1">
              MITRE ATT&CK Framework
            </div>
            <div className="text-xs text-muted-foreground">
              Reference available for detailed analysis
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};