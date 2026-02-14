import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { navigationConfig, getActiveTab } from "./NavigationConfig";
import { motion } from "framer-motion";

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const [openMenu, setOpenMenu] = useState(null);

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
                if (config.subItems && config.subItems.length > 0) {
                  e.preventDefault();
                  setOpenMenu(key);
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

      {openMenu && (
        (() => {
          const cfg = navigationConfig[openMenu];
          if (!cfg) return null;
          return (
            <div className="fixed inset-0 z-[60] bg-white">
              <div className="px-5 pt-12 pb-24 space-y-3 max-w-md mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold" style={{ color: cfg.color }}>Choisir une page</h2>
                  <button onClick={() => setOpenMenu(null)} className="px-3 py-1 rounded-xl border" style={{ borderColor: 'rgba(255,105,180,0.25)', color: cfg.color }}>
                    Fermer
                  </button>
                </div>
                {cfg.subItems?.map((sub) => (
                  <button
                    key={sub.path}
                    onClick={() => {
                      setOpenMenu(null);
                      navigate(sub.path);
                    }}
                    className="block w-full text-left px-4 py-4 rounded-2xl text-base font-semibold border shadow-sm"
                    style={{ borderColor: 'rgba(255,105,180,0.25)', color: cfg.color }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })()
      )}
    </nav>
  );
}