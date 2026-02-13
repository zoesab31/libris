import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { navigationConfig, getActiveTab } from "./NavigationConfig";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

export default function BottomNavigation() {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50 safe-area-bottom"
      style={{ 
        borderColor: 'rgba(255, 105, 180, 0.2)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {Object.entries(navigationConfig).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = activeTab === key;

          return (
            <Link
              key={key}
              to={config.path}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              <motion.div
                className="relative"
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.1 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -inset-3 rounded-2xl"
                    style={{ background: config.gradient }}
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <Icon 
                    className="w-6 h-6" 
                    style={{ 
                      color: isActive ? 'white' : config.color,
                      strokeWidth: isActive ? 2.5 : 2
                    }} 
                  />
                  <span 
                    className="text-xs font-semibold"
                    style={{ 
                      color: isActive ? 'white' : config.color
                    }}
                  >
                    {config.label}
                  </span>
                </div>
              </motion.div>
            </Link>
          );
        })}
        
        {/* Settings Tab */}
        <Link
          to={createPageUrl('AccountSettings')}
          className="flex flex-col items-center justify-center flex-1 h-full relative"
        >
          <motion.div
            className="relative"
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.1 }}
          >
            {location.pathname === createPageUrl('AccountSettings') && (
              <motion.div
                layoutId="activeTab"
                className="absolute -inset-3 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center gap-1">
              <Settings 
                className="w-6 h-6" 
                style={{ 
                  color: location.pathname === createPageUrl('AccountSettings') ? 'white' : '#FF1493',
                  strokeWidth: location.pathname === createPageUrl('AccountSettings') ? 2.5 : 2
                }} 
              />
              <span 
                className="text-xs font-semibold"
                style={{ 
                  color: location.pathname === createPageUrl('AccountSettings') ? 'white' : '#FF1493'
                }}
              >
                Paramètres
              </span>
            </div>
          </motion.div>
        </Link>

        {/* Profile Picture Tab - Links to MyPage */}
        <Link
          to={createPageUrl('MyPage')}
          className="flex flex-col items-center justify-center flex-1 h-full relative"
        >
          <motion.div
            className="relative"
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.1 }}
          >
            {location.pathname === createPageUrl('MyPage') && (
              <motion.div
                layoutId="activeTab"
                className="absolute -inset-3 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.full_name?.[0] || 'U'
                )}
              </div>
            </div>
          </motion.div>
        </Link>
      </div>
    </nav>
  );
}