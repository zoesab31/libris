import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { navigationConfig, getActiveTab } from "./NavigationConfig";
import { BookOpen, ChevronRight, LogOut, Settings } from "lucide-react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/notifications/NotificationBell";
import { motion, AnimatePresence } from "framer-motion";

export default function DesktopSidebar({ user }) {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);
  const [expandedSections, setExpandedSections] = useState({ [activeTab]: true });

  const toggleSection = (key) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <aside className="hidden md:flex flex-col w-72 border-r bg-white h-screen sticky top-0"
           style={{ borderColor: 'rgba(255, 105, 180, 0.15)' }}>
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: 'rgba(255, 105, 180, 0.15)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-xl" style={{ color: '#FF1493' }}>
              LIBRIS
            </h2>
            <p className="text-xs font-medium" style={{ color: '#FF69B4' }}>
              Your Reading Life 🌸
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {Object.entries(navigationConfig).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = activeTab === key;
          const isExpanded = expandedSections[key];
          const hasSubItems = config.subItems && config.subItems.length > 0;

          return (
            <div key={key} className="space-y-1">
              {/* Main item */}
              <div
                className={`flex items-center justify-between rounded-xl cursor-pointer transition-all ${
                  isActive ? 'shadow-lg' : 'hover:bg-pink-50'
                }`}
                style={isActive ? { background: config.gradient } : {}}
                onClick={() => hasSubItems ? toggleSection(key) : null}
              >
                <Link
                  to={config.path}
                  className="flex items-center gap-3 px-4 py-3 flex-1"
                  onClick={(e) => hasSubItems && e.preventDefault()}
                >
                  <Icon 
                    className="w-5 h-5" 
                    style={{ color: isActive ? 'white' : config.color }} 
                  />
                  <span 
                    className="font-semibold text-sm"
                    style={{ color: isActive ? 'white' : '#2D3748' }}
                  >
                    {config.label}
                  </span>
                </Link>
                {hasSubItems && (
                  <motion.div
                    className="px-3"
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight 
                      className="w-4 h-4" 
                      style={{ color: isActive ? 'white' : config.color }} 
                    />
                  </motion.div>
                )}
              </div>

              {/* Sub items */}
              {hasSubItems && (
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 space-y-1 pl-4 border-l-2"
                           style={{ borderColor: config.color + '40' }}>
                        {config.subItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = location.pathname === subItem.path;

                          return (
                            <Link
                              key={subItem.path}
                              to={subItem.path}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                                isSubActive 
                                  ? 'font-semibold' 
                                  : 'hover:bg-pink-50'
                              }`}
                              style={isSubActive ? {
                                backgroundColor: config.color + '15',
                                color: config.color
                              } : {
                                color: '#4A5568'
                              }}
                            >
                              <SubIcon className="w-4 h-4" />
                              <span className="text-sm">{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t space-y-3" style={{ borderColor: 'rgba(255, 105, 180, 0.15)' }}>
        <div className="flex items-center gap-3">
          <NotificationBell user={user} />
          <Link to={createPageUrl("AccountSettings")} className="flex-1">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
            </Button>
          </Link>
        </div>

        {user && (
          <div className="space-y-2">
            <Link to={createPageUrl("AccountSettings")}>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-pink-50 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden"
                     style={{ background: user.profile_picture ? 'transparent' : 'linear-gradient(135deg, #FF69B4, #FFB6C1)' }}>
                  {user.profile_picture ? (
                    <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user.full_name?.[0]?.toUpperCase() || 'U'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: '#2D3748' }}>
                    {user.full_name || 'Lectrice'}
                  </p>
                  <p className="text-xs truncate" style={{ color: '#FF69B4' }}>
                    {user.email}
                  </p>
                </div>
              </div>
            </Link>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full"
              style={{ 
                borderColor: 'rgba(255, 105, 180, 0.3)',
                color: '#FF1493'
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}