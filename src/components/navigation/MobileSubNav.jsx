import React from "react";
import { Link, useLocation } from "react-router-dom";
import { navigationConfig, getActiveTab } from "./NavigationConfig";

export default function MobileSubNav() {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);
  const config = navigationConfig[activeTab];
  const isOnMainPath = config && location.pathname === config.path;

  // Show the sommaire only on the section's root path; hide once a page is selected
  if (!config || !config.subItems || config.subItems.length === 0 || !isOnMainPath) return null;

  return (
    <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b"
    style={{ borderColor: 'rgba(255,105,180,0.15)' }}>
      <div className="px-4 py-3">
        <div className="space-y-2">
          {config.subItems.map((sub) => {
            const isActive = location.pathname === sub.path;
            return null;












          })}
        </div>
      </div>
    </div>);

}