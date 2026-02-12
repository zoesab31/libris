import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Library, MessageSquare, Menu } from "lucide-react";

export default function BottomNavbar({ unreadCount, onMoreClick }) {
  const location = useLocation();

  const navItems = [
    { 
      title: "Accueil", 
      url: createPageUrl("Dashboard"), 
      icon: BookOpen 
    },
    { 
      title: "Bibliothèque", 
      url: createPageUrl("MyLibrary"), 
      icon: Library 
    },
    { 
      title: "Messages", 
      url: createPageUrl("Chat"), 
      icon: MessageSquare,
      badge: unreadCount 
    },
    { 
      title: "Plus", 
      icon: Menu,
      isMore: true
    },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 md:hidden"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom)',
        borderColor: 'var(--beige)'
      }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = item.url && location.pathname === item.url;
          const Icon = item.icon;
          
          if (item.isMore) {
            return (
              <button
                key="more"
                onClick={onMoreClick}
                className="flex flex-col items-center justify-center gap-1 flex-1 h-full touch-none"
              >
                <Icon 
                  className="w-6 h-6" 
                  style={{ color: 'var(--warm-pink)' }}
                />
                <span 
                  className="text-xs font-medium"
                  style={{ color: 'var(--warm-pink)' }}
                >
                  {item.title}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.title}
              to={item.url}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative touch-none"
            >
              <div className="relative">
                <Icon 
                  className="w-6 h-6" 
                  style={{ color: isActive ? 'var(--warm-pink)' : '#9CA3AF' }}
                />
                {item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: '#FF0000' }}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span 
                className="text-xs font-medium"
                style={{ color: isActive ? 'var(--warm-pink)' : '#9CA3AF' }}
              >
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}