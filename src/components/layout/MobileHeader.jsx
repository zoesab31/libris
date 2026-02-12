import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, BookOpen } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import GlobalSearch from "@/components/layout/GlobalSearch";

const rootPages = [
  createPageUrl("Dashboard"),
  createPageUrl("MyLibrary"),
  createPageUrl("Chat"),
];

export default function MobileHeader({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isRootPage = rootPages.includes(location.pathname);
  
  return (
    <header 
      className="fixed top-0 left-0 right-0 bg-white border-b z-50 md:hidden"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        borderColor: 'var(--beige)'
      }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        {isRootPage ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" 
                 style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
                Nos Livres
              </h2>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 touch-none"
          >
            <ArrowLeft className="w-6 h-6" style={{ color: 'var(--warm-pink)' }} />
            <span className="font-semibold" style={{ color: 'var(--dark-text)' }}>
              Retour
            </span>
          </button>
        )}
        
        {user && (
          <div className="flex items-center gap-2">
            <NotificationBell user={user} />
          </div>
        )}
      </div>
      
      {isRootPage && location.pathname === createPageUrl("Dashboard") && (
        <div className="px-4 pb-3">
          <GlobalSearch user={user} />
        </div>
      )}
    </header>
  );
}