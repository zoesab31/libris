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

  return null;
























}