import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Star,
  FileText,
  Clock,
  ArrowRight,
  Inbox,
  Loader2
} from 'lucide-react';
import api from '../lib/api';
import { Button } from '@/components/ui/button';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = Math.max(0, now - date);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type) {
  switch (type) {
    case 'STATUS_RESOLVED':
      return <CheckCircle2 className="w-4 h-4 text-[#3F6B4A]" />;
    case 'STATUS_REJECTED':
      return <AlertCircle className="w-4 h-4 text-[#9B4A3F]" />;
    case 'GRIEVANCE_ASSIGNED':
    case 'OFFICER_ASSIGNED':
      return <UserCheck className="w-4 h-4 text-[#2B5D4F] dark:text-[#7EB5A6]" />;
    case 'FEEDBACK':
      return <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" />;
    case 'GRIEVANCE_SUBMITTED':
      return <FileText className="w-4 h-4 text-[#2B5D4F] dark:text-[#7EB5A6]" />;
    case 'IN_PROGRESS':
    case 'STATUS_IN_PROGRESS':
      return <Clock className="w-4 h-4 text-[#B8862E]" />;
    default:
      return <Bell className="w-4 h-4 text-[#2B5D4F] dark:text-[#7EB5A6]" />;
  }
}

export default function NotificationBell() {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const containerRef = useRef(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(Number(res.data?.unreadCount || 0));
    } catch {
      // Ignore background poll errors
    }
  }, [isAuthenticated]);

  // Fetch full notifications list
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.get('/notifications?limit=25');
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Poll for unread count periodically
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 25000); // every 25 seconds
    const onFocus = () => fetchUnreadCount();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAuthenticated, fetchUnreadCount]);

  // When dropdown opens, fetch latest notifications
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close on escape or outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id, link, e) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (link) {
        setIsOpen(false);
        navigate(link);
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
      if (link) {
        setIsOpen(false);
        navigate(link);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-[#E4E0D8]/50 dark:hover:bg-[#22262B] transition-colors h-9 w-9 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B5D4F]"
      >
        <Bell className="h-4 w-4 text-[#2B5D4F] dark:text-[#7EB5A6]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#2B5D4F] text-white text-[9px] font-mono font-bold shadow-xs animate-in zoom-in-50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-[#E4E0D8] dark:border-[#2A2E33] bg-[#FAF9F6] dark:bg-[#16191C] shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E0D8]/80 dark:border-[#2A2E33]/80 bg-white dark:bg-[#1A1D20]">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-sm text-[#1C2024] dark:text-[#FAF9F6]">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#2B5D4F]/10 text-[#2B5D4F] dark:text-[#7EB5A6] border border-[#2B5D4F]/20">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="flex items-center gap-1 text-[11px] font-mono text-[#2B5D4F] dark:text-[#7EB5A6] hover:underline disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                Mark all read
              </button>
            )}
          </div>

          {/* List Area */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#E4E0D8]/60 dark:divide-[#2A2E33]/60">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-[#2B5D4F]" />
                <span className="text-xs font-mono">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#2B5D4F]/10 flex items-center justify-center text-[#2B5D4F] dark:text-[#7EB5A6]">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-xs font-serif font-bold text-[#1C2024] dark:text-[#FAF9F6]">
                  All caught up!
                </p>
                <p className="text-[11px] text-muted-foreground font-sans max-w-xs">
                  No notifications to review. You will receive real-time alerts when your grievances are logged, assigned, or resolved.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.isRead;
                return (
                  <div
                    key={item.id}
                    onClick={(e) => handleMarkAsRead(item.id, item.link, e)}
                    className={`group relative p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      isUnread
                        ? 'bg-white dark:bg-[#1A1D20]/90 hover:bg-[#FAF9F6] dark:hover:bg-[#1D2125]'
                        : 'bg-[#FAF9F6]/50 dark:bg-[#16191C]/50 hover:bg-white dark:hover:bg-[#1A1D20]'
                    }`}
                  >
                    {/* Status Dot / Unread Indicator */}
                    <div className="shrink-0 mt-0.5">
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-[#FAF9F6] dark:bg-[#121517] border border-[#E4E0D8] dark:border-[#2A2E33]">
                        {getNotificationIcon(item.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-sans line-clamp-1 ${
                          isUnread
                            ? 'font-bold text-[#1C2024] dark:text-[#FAF9F6]'
                            : 'font-medium text-foreground/80'
                        }`}>
                          {item.title}
                        </p>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-[#2B5D4F] dark:bg-[#7EB5A6] shrink-0" />
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 font-sans leading-relaxed">
                        {item.message}
                      </p>

                      <div className="flex items-center justify-between mt-1.5 pt-0.5 text-[10px] font-mono text-muted-foreground">
                        <span>{formatRelativeTime(item.createdAt)}</span>
                        {item.link && (
                          <span className="inline-flex items-center gap-0.5 text-[#2B5D4F] dark:text-[#7EB5A6] opacity-0 group-hover:opacity-100 transition-opacity">
                            View details
                            <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t border-[#E4E0D8]/80 dark:border-[#2A2E33]/80 bg-white dark:bg-[#1A1D20] text-center">
              <span className="text-[10px] font-mono text-muted-foreground">
                ANITS Campus Redressal Notifications
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
