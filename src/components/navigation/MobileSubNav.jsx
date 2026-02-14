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
    <div className="md:hidden fixed inset-0 z-50 bg-white">
      <div className="px-5 pt-12 pb-24 space-y-3 max-w-md mx-auto">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#FF1493' }}>Choisir une page</h2>
        {config.subItems.map((sub) => (
          <Link
            key={sub.path}
            to={sub.path}
            className="block w-full px-4 py-4 rounded-2xl text-base font-semibold border shadow-sm"
            style={{ borderColor: 'rgba(255,105,180,0.25)', color: '#FF1493' }}
          >
            {sub.label}
          </Link>
        ))}
      </div>
    </div>
  );
}