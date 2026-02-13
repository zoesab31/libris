import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DesktopSidebar from "@/components/navigation/DesktopSidebar";
import BottomNavigation from "@/components/navigation/BottomNavigation";

function LayoutContent({ children, user, handleLogout, isDark }) {



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

  return (
    <>
      {/* Desktop Sidebar */}
      <DesktopSidebar user={user} />

      {/* Mobile Bottom Navigation */}
      <BottomNavigation />

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {children}
      </main>
    </>
  );
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, [user?.theme]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const isDark = user?.theme === 'dark';

  return (
    <div className="flex min-h-screen w-full">
      <style>{`
        /* Native Android styling */
        body {
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch;
        }

        button, a, nav a, [role="button"] {
          -webkit-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        .touch-none {
          -webkit-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* Mobile adjustments */
        @media (max-width: 767px) {
          body {
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
        
        /* Hide scrollbars on mobile for cleaner look */
        @media (max-width: 767px) {
          ::-webkit-scrollbar {
            display: none;
          }
          * {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        }
        
        :root {
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
        }

        .dark-theme {
          --cream: #1a1a2e;
          --beige: #2d1b2e;
          --soft-pink: #ff69b4;
          --warm-pink: #ff1493;
          --deep-pink: #ff0080;
          --gold: #ffb6d9;
          --rose-gold: #ff9eb3;
          --dark-text: #ffb3d9;
          --lavender: #e91e63;
          --peach: #ff8fa3;
        }

        .dark-theme body {
          background: linear-gradient(135deg, #1a1a2e 0%, #2d1b2e 100%);
          color: var(--dark-text);
        }

        .dark-theme .sidebar-container {
          background: linear-gradient(180deg, #1a1a2e 0%, #2d1b2e 100%) !important;
          border-right-color: #ff1493 !important;
        }

        .dark-theme .sidebar-header {
          border-bottom-color: #ff69b4 !important;
        }

        .dark-theme .sidebar-footer {
          border-top-color: #ff69b4 !important;
        }

        .dark-theme .sidebar-link {
          color: #ffb3d9;
        }

        .dark-theme .sidebar-link:hover {
          background-color: rgba(255, 20, 147, 0.2);
        }

        /* Book title and author display utilities */
        .book-title-display {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          overflow-wrap: anywhere;
          word-break: break-word;
          line-height: 1.3;
          font-weight: 600;
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
            font-size: clamp(13px, 3.5vw, 15px);
          }

          .book-author-display {
            font-size: clamp(11px, 3vw, 13px);
          }
        }

        @media (min-width: 641px) and (max-width: 1024px) {
          .book-title-display {
            font-size: clamp(14px, 2.4vw, 16px);
          }

          .book-author-display {
            font-size: clamp(12px, 2vw, 14px);
          }
        }

        @media (min-width: 1025px) {
          .book-title-display {
            font-size: clamp(15px, 1.2vw, 17px);
          }

          .book-author-display {
            font-size: clamp(13px, 1vw, 15px);
          }
        }

        @media (max-width: 768px) {
          .mobile-hide {
            display: none;
          }

          /* Better mobile spacing */
          body {
            font-size: 16px; /* Prevents iOS zoom on inputs */
          }

          /* Touch-friendly buttons */
          button, a {
            min-height: 48px;
            min-width: 48px;
          }

          /* Better mobile padding */
          .card-mobile {
            padding: 1rem !important;
          }
        }

        /* Smooth transitions globally */
        * {
          transition: background-color 0.2s ease, transform 0.2s ease;
          }

          /* Safe area handling for mobile */
          .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
          }
          `}</style>
          <LayoutContent user={user} handleLogout={handleLogout} isDark={isDark}>
          {children}
          </LayoutContent>
          </div>
          );
          }