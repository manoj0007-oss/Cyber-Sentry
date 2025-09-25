import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStore } from '@/store/networkStore';
import { cn } from '@/lib/utils';
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export const SecurityAlertFeed = () => {
  const { alerts } = useNetworkStore();

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warning':
        return <Shield className="w-4 h-4" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'border-cyber-danger text-cyber-danger bg-cyber-danger/10';
      case 'warning':
        return 'border-cyber-secondary text-cyber-secondary bg-cyber-secondary/10';
      case 'success':
        return 'border-cyber-primary text-cyber-primary bg-cyber-primary/10';
      default:
        return 'border-cyber-accent text-cyber-accent bg-cyber-accent/10';
    }
  };

  const getAlertAnimation = (level: string) => {
    switch (level) {
      case 'critical':
        return 'animate-pulse-danger';
      case 'warning':
        return 'animate-pulse-secondary';
      case 'success':
        return 'animate-pulse-primary';
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-panel p-4 h-full"
    >
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-cyber-accent/20">
        <Shield className="w-5 h-5 text-cyber-accent animate-pulse-primary" />
        <h3 className="font-header text-sm text-cyber-accent">Security Alerts</h3>
        <div className="ml-auto text-xs text-muted-foreground">
          LIVE
        </div>
      </div>

      <div className="space-y-3 h-full overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-cyber-accent/20">
        <AnimatePresence>
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted-foreground py-8"
            >
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No alerts detected</p>
              <p className="text-xs">All systems nominal</p>
            </motion.div>
          ) : (
            alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.9 }}
                className={cn(
                  'border rounded-lg p-3 backdrop-blur-sm',
                  getAlertColor(alert.level),
                  getAlertAnimation(alert.level)
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    {getAlertIcon(alert.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      {alert.text}
                    </p>
                    <p className="text-xs opacity-70 mt-1">
                      {alert.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};