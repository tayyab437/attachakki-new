import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useStore } from '../lib/store';

export default function NotificationToast() {
  const { notifications, clearNotification } = useStore();
  const [visibleNotifications, setVisibleNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Only show unread notifications that were created in the last 10 seconds
    const now = new Date().getTime();
    const active = notifications.filter(n => {
      const created = new Date(n.created_at).getTime();
      return !n.read && (now - created < 10000);
    });
    
    setVisibleNotifications(active);

    // Auto-hide after 4 seconds
    const timers = active.map(n => {
      return setTimeout(() => {
        clearNotification(n.id);
      }, 4000);
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, [notifications, clearNotification]);

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {visibleNotifications.slice(0, 3).map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            className="pointer-events-auto bg-white border border-gray-150 rounded-2xl shadow-xl p-4 flex items-start gap-3 min-w-[280px] max-w-sm"
          >
            <div className={`shrink-0 p-2 rounded-xl ${
              n.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
              n.type === 'credit_alert' || n.type === 'low_stock' ? 'bg-orange-50 text-orange-600' :
              'bg-blue-50 text-blue-600'
            }`}>
              {n.type === 'success' ? <CheckCircle className="h-5 w-5" /> :
               n.type === 'credit_alert' || n.type === 'low_stock' ? <AlertTriangle className="h-5 w-5" /> :
               <Info className="h-5 w-5" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-extrabold text-gray-900 leading-tight truncate">{n.title}</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
            </div>

            <button 
              onClick={() => clearNotification(n.id)}
              className="shrink-0 p-1 text-gray-300 hover:text-gray-500 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
