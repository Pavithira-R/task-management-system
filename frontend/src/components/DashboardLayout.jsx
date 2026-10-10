import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationPanel from './NotificationPanel';
import GlobalSearch from './GlobalSearch';
import api from '../services/api';
import { useToast } from '../utils/ToastContext';
import { subscribeToNotifications, getSocket } from '../services/socket';
import projectService from '../services/projectService';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: '/projects',
    label: 'Projects',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    to: '/admin/reports',
    label: 'Reports',
    excludeRoles: ['COLLABORATOR', 'PROJECT_MANAGER'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/tasks',
    label: 'Tasks',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/tasks/kanban',
    label: 'Kanban Board',
    excludeRoles: ['ADMIN'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    to: '/admin/users', // Reusing User Management page for Team Members
    label: 'Team Members',
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    to: '/calendar',
    label: 'Calendar',
    excludeRoles: ['ADMIN'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: '/messages',
    label: 'Messages',
    excludeRoles: ['ADMIN'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },


  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (location.pathname === '/messages') {
      setHasNewMessage(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications');
        setNotifications(response.data.data || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();

    const unsubscribe = subscribeToNotifications((newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      toast.info(newNotif.message);
    });

    const socket = getSocket();
    if (socket) {
      const setupGlobalMessaging = async () => {
        try {
          const res = await projectService.getAllProjects();
          if (res.success) {
            res.data.forEach(p => socket.emit('joinProject', p.id));
          }
        } catch (err) {
          console.error('Failed to setup global messaging:', err);
        }
      };
      setupGlobalMessaging();

      const handleGlobalMessage = (msg) => {
        // If the message is from the current user, don't show the dot
        if (msg.sender?.id === user.id) return;
        if (location.pathname !== '/messages') {
          setHasNewMessage(true);
        }
      };
      socket.on('receiveMessage', handleGlobalMessage);

      return () => {
        unsubscribe();
        socket.off('receiveMessage', handleGlobalMessage);
      };
    }

    return () => unsubscribe();
  }, [user, location.pathname]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const NavLink = ({ item }) => {
    const userRole = user?.role;
    if (item.adminOnly && userRole !== 'ADMIN') return null;
    if (item.excludeRoles && item.excludeRoles.includes(userRole)) return null;

    let active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
    if (item.to === '/tasks' && (location.pathname.startsWith('/tasks/kanban') || location.pathname.startsWith('/tasks/create'))) {
      active = false;
    }
    if (location.pathname === item.to) active = true;

    return (
      <button
        onClick={() => { if(!item.to.startsWith('#')) navigate(item.to); setSidebarOpen(false); }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer text-left relative ${
          active
            ? 'bg-white dark:bg-slate-800 text-[#0D5A60] dark:text-white shadow-lg shadow-black/10'
            : 'text-white/60 hover:bg-white/10 hover:text-white'
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#2AA7B3] rounded-r-full" />
        )}
        <div className="flex items-center gap-3">
          <span className={`transition-colors ${active ? 'text-[#118B95] dark:text-[#2AA7B3]' : 'text-white/50'}`}>{item.icon}</span>
          <span>{item.label}</span>
        </div>
        {item.label === 'Messages' && hasNewMessage && (
          <span className="w-2 h-2 rounded-full bg-[#2AA7B3] shadow-[0_0_8px_rgba(42,167,179,0.9)]" />
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F8F9] dark:bg-slate-900 flex relative font-sans transition-colors duration-200">
      
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`flex flex-col w-64 bg-[#0D5A60] dark:bg-slate-950 fixed top-0 left-0 h-full z-40 overflow-hidden transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* ── Professional Geometric Background Elements ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-200">
          
          {/* Top-right angled glass panel */}
          <div className="absolute -top-[10%] -right-[20%] w-[150%] h-[120px] bg-white/[0.04] dark:bg-white/[0.02] transform -rotate-12 rounded-[40px] border border-white/10 dark:border-white/5 backdrop-blur-sm" />
          
          {/* Middle-left angled glass panel */}
          <div className="absolute top-[35%] -left-[30%] w-[120%] h-[80px] bg-gradient-to-r from-transparent to-white/[0.05] dark:to-white/[0.02] transform -rotate-12 rounded-[30px] border border-white/5" />
          
          {/* Bottom-right angled accent panel */}
          <div className="absolute -bottom-[5%] -right-[10%] w-[100%] h-[150px] bg-[#2AA7B3]/10 dark:bg-[#118B95]/10 transform -rotate-12 rounded-[50px] border border-white/10 dark:border-white/5" />

          {/* Subtle noise/texture overlay to make it look premium */}
          <div 
            className="absolute inset-0 opacity-[0.15] mix-blend-overlay"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />

          {/* Edge highlight line */}
          <div className="absolute right-0 inset-y-0 w-px bg-gradient-to-b from-transparent via-white/10 dark:via-white/5 to-transparent" />
        </div>

        {/* ── Logo Card (floating, like reference image) ── */}
        <div className="relative z-10 px-5 pt-6 pb-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg shadow-black/20 border border-white/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-black text-white tracking-tight leading-none">TaskFlow</span>
            <p className="text-[10px] text-white/50 font-medium uppercase tracking-widest mt-0.5">Workspace</p>
          </div>
        </div>

        {/* ── User Card ── */}
        <div className="relative z-10 mx-4 mb-5">
          <div className="bg-white/10 border border-white/15 backdrop-blur rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2AA7B3] to-[#118B95] flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate leading-none mb-0.5">{user?.name}</p>
              <p className="text-[10px] text-white/50 font-medium truncate">
                {user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'PROJECT_MANAGER' ? 'Project Manager' : 'Collaborator'}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0" />
          </div>
        </div>

        {/* ── Nav Items ── */}
        <nav className="relative z-10 flex-1 px-4 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-1 px-3.5">Navigation</p>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} item={item} />
          ))}
        </nav>

        {/* ── Sign Out ── */}
        <div className="relative z-10 px-4 py-5">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-white/50 rounded-2xl hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-[#E2E8F0] dark:border-slate-700 px-6 h-16 flex items-center justify-between transition-colors duration-200">
          
          {/* Mobile menu button */}
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-[#118B95] cursor-pointer">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Global Search */}
          <GlobalSearch />

          <div className="flex flex-1 justify-end items-center gap-4">
            
            {/* Quick Create Task (Desktop) */}
            {(user?.role !== 'COLLABORATOR' && user?.role !== 'ADMIN') && (
              <button 
                onClick={() => navigate('/tasks/create')}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#118B95] hover:bg-[#0D5A60] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create
              </button>
            )}

            <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 hidden md:block"></div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="relative p-1.5 rounded-full text-gray-500 hover:text-[#118B95] hover:bg-[#E6F5F6] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Notification Bell Button */}
            <button 
              onClick={() => setIsNotificationOpen(true)}
              className="relative text-gray-500 hover:text-[#118B95] cursor-pointer p-1 rounded-full hover:bg-[#E6F5F6] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            {/* Topbar Avatar */}
            <div 
              onClick={() => navigate('/settings')}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0D5A60] to-[#2AA7B3] flex items-center justify-center text-white font-bold text-xs shadow-sm cursor-pointer hover:shadow-md hover:scale-105 transition-all"
            >
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      <NotificationPanel 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)} 
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </div>
  );
}