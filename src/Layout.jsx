import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Library, Sparkles, Heart, Users, LogOut, Trophy, BookUser, Quote, Image, Palette, Map, Store, MessageCircle, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import NotificationBell from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";

const navigationItems = [
  {
    title: "Tableau de bord",
    url: createPageUrl("Dashboard"),
    icon: BookOpen,
  },
  {
    title: "Ma Bibliothèque",
    url: createPageUrl("MyLibrary"),
    icon: Library,
  },
  {
    title: "Séries à compléter",
    url: createPageUrl("Series"),
    icon: BookOpen,
  },
  {
    title: "Citations",
    url: createPageUrl("Quotes"),
    icon: Quote,
  },
  {
    title: "Bingo Lecture",
    url: createPageUrl("Bingo"),
    icon: Sparkles,
  },
  {
    title: "Statistiques",
    url: createPageUrl("Statistics"),
    icon: TrendingUp,
  },
  {
    title: "Tournoi du Livre",
    url: createPageUrl("BookTournament"),
    icon: Trophy,
  },
  {
    title: "Abécédaire",
    url: createPageUrl("Authors"),
    icon: BookUser,
  },
  {
    title: "Lectures Communes",
    url: createPageUrl("SharedReadings"),
    icon: Users,
  },
  {
    title: "Fan Art",
    url: createPageUrl("FanArt"),
    icon: Image,
  },
  {
    title: "Mes Persos Préférés",
    url: createPageUrl("Profile"),
    icon: Heart,
  },
  {
    title: "Inspi Ongles",
    url: createPageUrl("NailInspo"),
    icon: Palette,
  },
  {
    title: "Maps",
    url: createPageUrl("Maps"),
    icon: Map,
  },
  {
    title: "Découvrir",
    url: createPageUrl("Discover"),
    icon: Sparkles,
  },
];

function LayoutContent({ children, user, handleLogout, isDark }) {
  const location = useLocation();
  const { setOpen } = useSidebar();

  // Apply theme immediately without lag
  useEffect(() => {
    const theme = user?.theme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('color-scheme', theme);
  }, [user?.theme]);

  // Fetch unread messages count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadMessagesCount', user?.email],
    queryFn: async () => {
      if (!user?.email) return 0;
      
      const allRooms = await base44.entities.ChatRoom.list();
      const userRooms = allRooms.filter(room => 
        room.participants?.includes(user.email)
      );
      
      if (userRooms.length === 0) return 0;
      
      const roomIds = userRooms.map(r => r.id);
      const allMessages = await base44.entities.ChatMessage.list();
      
      const unread = allMessages.filter(msg => 
        roomIds.includes(msg.chat_room_id) &&
        msg.sender_email !== user.email &&
        (!msg.seen_by || !msg.seen_by.includes(user.email))
      );
      
      return unread.length;
    },
    enabled: !!user?.email,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  useEffect(() => {
    if (!user) return;

    const updateActivity = async () => {
      try {
        await base44.auth.updateMe({
          last_active_at: new Date().toISOString()
        });
      } catch (error) {
        console.log('Could not update activity:', error);
      }
    };

    updateActivity();
    const interval = setInterval(updateActivity, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setOpen(false);
    }
  }, [location.pathname, setOpen]);

  return (
    <>
      <Sidebar 
        className={`border-r sidebar-container ${isDark ? 'dark-sidebar' : ''}`}
        style={{ 
          borderColor: isDark ? '#2A2637' : 'var(--beige)',
          backgroundColor: isDark ? '#0C0915' : 'white'
        }}>
        <SidebarHeader 
          className="border-b p-3 md:p-6 sidebar-header" 
          style={{ 
            borderColor: isDark ? '#2A2637' : 'var(--beige)',
            backgroundColor: isDark ? '#0C0915' : 'transparent'
          }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center" 
                 style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
              <BookOpen className="w-4 h-4 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm md:text-lg" style={{ color: isDark ? '#F2F1F7' : 'var(--dark-text)' }}>
                Nos Livres
              </h2>
              <p className="text-[9px] md:text-xs font-medium" style={{ color: isDark ? '#8B7CF6' : 'var(--deep-pink)' }}>
                Notre bibliothèque 🌸
              </p>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent className="p-2 md:p-3" style={{ backgroundColor: isDark ? '#0C0915' : 'transparent' }}>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className={`mb-1 rounded-xl transition-all duration-200 sidebar-link ${
                        location.pathname === item.url 
                          ? 'text-white shadow-md' 
                          : 'hover:bg-opacity-50'
                      }`}
                      style={location.pathname === item.url ? {
                        background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))'
                      } : {
                        color: isDark ? '#cbd5e0' : 'inherit',
                        backgroundColor: 'transparent'
                      }}
                    >
                      <Link to={item.url} className="flex items-center gap-2 px-2 md:px-3 py-2">
                        <item.icon className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                        <span className="font-medium text-xs md:text-base">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter 
          className="border-t p-2 md:p-4 sidebar-footer" 
          style={{ 
            borderColor: isDark ? '#2A2637' : 'var(--beige)',
            backgroundColor: isDark ? '#0C0915' : 'transparent'
          }}>
          {user && (
            <div className="space-y-2">
              <Link to={createPageUrl("AccountSettings")}>
                <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-opacity-10 transition-colors cursor-pointer"
                     style={{ 
                       backgroundColor: isDark ? 'rgba(255, 107, 157, 0.1)' : 'transparent',
                     }}>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0"
                       style={{ background: user.profile_picture ? 'transparent' : 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
                    {user.profile_picture ? (
                      <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user.full_name?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs md:text-sm truncate" style={{ color: isDark ? '#F2F1F7' : 'var(--dark-text)' }}>
                      {user.full_name || 'Lectrice'}
                    </p>
                    <p className="text-[9px] md:text-xs truncate font-medium" style={{ color: isDark ? '#C6C4D4' : 'var(--deep-pink)' }}>
                      {user.email}
                    </p>
                  </div>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
                style={{ 
                  backgroundColor: isDark ? '#1A1628' : 'var(--beige)',
                  color: isDark ? '#8B7CF6' : 'var(--deep-pink)',
                  border: isDark ? '1px solid #2A2637' : 'none'
                }}
              >
                <LogOut className="w-3 h-3 md:w-4 h-4" />
                Déconnexion
              </button>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="border-b px-3 md:px-6 py-2 md:py-4 flex items-center justify-between sticky top-0 z-10" 
                style={{ 
                  borderColor: isDark ? '#2A2637' : 'var(--beige)',
                  backgroundColor: isDark ? 'rgba(15, 12, 26, 0.95)' : 'white',
                  backdropFilter: isDark ? 'blur(10px)' : 'none'
                }}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <SidebarTrigger className="hover:bg-opacity-50 p-4 md:p-2 rounded-lg transition-colors -ml-2 md:m-0 flex-shrink-0" 
                            style={{ color: isDark ? '#cbd5e0' : 'inherit' }} />
            <h1 className="text-base md:text-xl font-bold md:hidden truncate cursor-pointer" 
                style={{ color: isDark ? '#F2F1F7' : 'var(--dark-text)' }}
                onClick={() => {
                  const trigger = document.querySelector('[data-sidebar-trigger]');
                  if (trigger) trigger.click();
                }}>
              Nos Livres
            </h1>
          </div>
          {user && (
            <div className="flex items-center gap-1 md:gap-3">
              <Link to={createPageUrl("Chat")}>
                <Button variant="ghost" size="icon" className="relative w-8 h-8 md:w-10 md:h-10">
                  <MessageCircle className="w-4 h-4 md:w-5 h-5" style={{ color: isDark ? '#8B7CF6' : 'var(--deep-pink)' }} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
                          style={{ backgroundColor: '#FF0000' }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
              <NotificationBell user={user} />
            </div>
          )}
        </header>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </>
  );
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Load theme from localStorage immediately for instant rendering
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    base44.auth.me().then(u => {
      setUser(u);
      const theme = u?.theme || 'light';
      localStorage.setItem('app-theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const isDark = user?.theme === 'dark';

  return (
    <SidebarProvider defaultOpen={false}>
      <style>{`
        :root,
        [data-theme="light"] {
          --cream: #FFF0F6;
          --beige: #FFD6E8;
          --soft-pink: #FF69B4;
          --warm-pink: #FF1493;
          --deep-pink: #E91E63;
          --gold: #FFB6C1;
          --rose-gold: #FFB3D9;
          --dark-text: #C2185B;
          --lavender: #F8BBD0;
          --peach: #FFCCE5;
          --bg-gradient: linear-gradient(135deg, #FFF0F6 0%, #FFE4EC 100%);
          --sidebar-bg: white;
          --sidebar-border: var(--beige);
          --text-primary: #2D3748;
          --text-secondary: #718096;
          --card-bg: white;
          --card-border: #FFE4EC;
          --hover-bg: #FFF7FA;
        }

        [data-theme="dark"] {
          --cream: #0F0C1A;
          --beige: #2A2637;
          --soft-pink: #8B7CF6;
          --warm-pink: #7C6FE0;
          --deep-pink: #D97FA6;
          --gold: #B88AA3;
          --rose-gold: #D97FA6;
          --dark-text: #F2F1F7;
          --lavender: #C6C4D4;
          --peach: #9A97B0;
          --bg-gradient: linear-gradient(135deg, #0F0C1A 0%, #1A1628 100%);
          --sidebar-bg: #0C0915;
          --sidebar-border: #2A2637;
          --text-primary: #F2F1F7;
          --text-secondary: #C6C4D4;
          --text-tertiary: #9A97B0;
          --card-bg: #1A1628;
          --card-border: #2A2637;
          --hover-bg: #211E2F;
        }

        body {
          background: var(--bg-gradient);
          color: var(--text-primary);
          transition: none;
        }

        .sidebar-container {
          background: var(--sidebar-bg) !important;
          border-right-color: var(--sidebar-border) !important;
        }

        [data-theme="dark"] .sidebar-header {
          border-bottom-color: #2A2637 !important;
          background: transparent !important;
        }

        [data-theme="dark"] .sidebar-footer {
          border-top-color: #2A2637 !important;
          background: transparent !important;
        }

        [data-theme="dark"] .sidebar-link {
          color: #C6C4D4;
        }

        [data-theme="dark"] .sidebar-link:hover {
          background-color: #1A1628 !important;
          color: #F2F1F7;
        }

        [data-theme="dark"] .stats-card {
          background: #1A1628 !important;
          border: 1px solid #2A2637 !important;
        }

        [data-theme="dark"] .stats-card:hover {
          background: #211E2F !important;
          border-color: #353243 !important;
        }

        [data-theme="dark"] header {
          background: rgba(15, 12, 26, 0.95) !important;
          border-color: #2A2637 !important;
        }

        [data-theme="dark"] main > div {
          background: transparent !important;
        }

        /* Cards */
        [data-theme="dark"] .shadow-lg,
        [data-theme="dark"] .rounded-2xl,
        [data-theme="dark"] .rounded-3xl {
          background: var(--card-bg) !important;
          border: 1px solid var(--card-border);
        }

        [data-theme="dark"] .bg-white {
          background: var(--card-bg) !important;
        }

        /* Progress bars */
        [data-theme="dark"] .progress-bg {
          background: #2A2637 !important;
        }

        [data-theme="dark"] .progress-fill {
          background: linear-gradient(90deg, #8B7CF6, #D97FA6) !important;
        }

        /* Buttons */
        [data-theme="dark"] button[style*="gradient"] {
          background: linear-gradient(135deg, #8B7CF6, #D97FA6) !important;
        }

        /* Activity items */
        [data-theme="dark"] .activity-item {
          border-color: #2A2637 !important;
        }

        [data-theme="dark"] .activity-item:hover {
          background: var(--hover-bg) !important;
        }

        /* Icon backgrounds - dark mode specific colors */
        [data-theme="dark"] .icon-bg-pink {
          background: rgba(139, 124, 246, 0.15) !important;
        }

        [data-theme="dark"] .icon-bg-purple {
          background: rgba(217, 127, 166, 0.15) !important;
        }

        [data-theme="dark"] .icon-bg-green {
          background: rgba(107, 154, 127, 0.15) !important;
        }

        [data-theme="dark"] .icon-bg-yellow {
          background: rgba(184, 138, 111, 0.15) !important;
        }

        /* Book title and author display utilities */
        .book-title-display {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          overflow-wrap: anywhere;
          word-break: break-word;
          line-height: 1.25;
        }

        .book-author-display {
          overflow-wrap: anywhere;
          white-space: normal;
          line-height: 1.2;
        }

        /* Smooth text wrapping for cards */
        .card-text-wrap {
          min-width: 0;
          flex: 1;
        }

        /* Tooltip for truncated text */
        .book-title-display:hover::after,
        .book-author-display:hover::after {
          content: attr(title);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-8px);
          background-color: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          white-space: normal;
          max-width: 250px;
          z-index: 1000;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
          line-height: 1.4;
        }

        @media (hover: hover) {
          .book-title-display:hover::after,
          .book-author-display:hover::after {
            opacity: 1;
          }
        }

        /* Prevent badge overlap */
        .book-card-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          z-index: 2;
        }

        /* Card overlay gradient for readability */
        .card-title-overlay {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 10px 12px;
          background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,240,246,0.9) 100%);
        }

        /* Responsive text sizing */
        @media (max-width: 640px) {
          .book-title-display {
            font-size: clamp(12px, 3vw, 14px);
          }
          
          .book-author-display {
            font-size: clamp(10px, 2.5vw, 12px);
          }
        }

        @media (min-width: 641px) and (max-width: 1024px) {
          .book-title-display {
            font-size: clamp(13px, 2.4vw, 15px);
          }
          
          .book-author-display {
            font-size: clamp(11px, 2vw, 13px);
          }
        }

        @media (min-width: 1025px) {
          .book-title-display {
            font-size: clamp(14px, 1.2vw, 16px);
          }
          
          .book-author-display {
            font-size: clamp(12px, 1vw, 14px);
          }
        }

        @media (max-width: 768px) {
          .mobile-hide {
            display: none;
          }
        }
      `}</style>
      <div className="min-h-screen flex w-full" style={{ backgroundColor: 'var(--cream)' }}>
        <LayoutContent user={user} handleLogout={handleLogout} isDark={isDark}>
          {children}
        </LayoutContent>
      </div>
    </SidebarProvider>
  );
}