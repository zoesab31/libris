import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { navigationConfig, getActiveTab } from "./NavigationConfig";
import { motion } from "framer-motion";

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    // Fermer le menu dès que l'URL change
    setOpenMenu(null);
  }, [location.pathname]);

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
              onClick={(e) => {
                if (config.subItems && config.subItems.length > 0 && location.pathname === config.path) {
                  e.preventDefault();
                  setOpenMenu(prev => (prev === key ? null : key));
                } else {
                  setOpenMenu(null);
                }
              }}
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
        
      </div>

      {openMenu && (() => {
          const cfg = navigationConfig[openMenu];
          if (!cfg) return null;
          return (
            <div className="absolute bottom-16 left-2 right-2 z-[60]">
              <div className="rounded-2xl border bg-white shadow-xl max-h-60 overflow-auto p-2" style={{ borderColor: 'rgba(255,105,180,0.25)' }}>
                {cfg.subItems?.map((sub) => (
                  <button
                    key={sub.path}
                    onClick={() => {
                      navigate(sub.path);
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-3 py-3 rounded-xl hover:bg-pink-50 text-pink-600 font-semibold"
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
    </nav>
  );
}