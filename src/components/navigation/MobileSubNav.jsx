import React from "react";
import { Link, useLocation } from "react-router-dom";
import { navigationConfig, getActiveTab } from "./NavigationConfig";

export default function MobileSubNav() {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);
  const config = navigationConfig[activeTab];
  const isOnMainPath = config && location.pathname === config.path;

  // Afficher la sous-nav uniquement sur la racine de section; cacher après sélection
  if (!config || !config.subItems || config.subItems.length === 0 || !isOnMainPath) return null;

  return (
    <div className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b" style={{ borderColor: 'rgba(255,105,180,0.15)' }}>
      <div className="px-4 py-2 overflow-x-auto">
        <div className="flex gap-2">
          {config.subItems.map((sub) => {
            const isActive = location.pathname === sub.path;
            return (
              <Link
                key={sub.path}
                to={sub.path}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${isActive ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-pink-600 border-pink-200'}`}
              >
                {sub.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}