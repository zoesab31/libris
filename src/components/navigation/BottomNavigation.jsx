import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { navigationConfig, getActiveTab } from "./NavigationConfig";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion } from "framer-motion";

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const [openFor, setOpenFor] = React.useState(null);

  const handleMainClick = (e, key, config) => {
    if (config.subItems && config.subItems.length > 0) {
      e.preventDefault();
      setOpenFor(key);
    }
  };

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
              onClick={(e) => handleMainClick(e, key, config)}
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

      <Sheet open={!!openFor} onOpenChange={(val) => !val && setOpenFor(null)}>
        <SheetContent side="bottom" className="pb-8">
          <SheetHeader>
            <SheetTitle>Choisir une page</SheetTitle>
          </SheetHeader>
          <div className="grid gap-2 mt-2">
            {openFor && navigationConfig[openFor]?.subItems?.map((sub) => (
              <button
                key={sub.path}
                className="w-full px-4 py-3 rounded-xl border text-left font-semibold"
                onClick={() => { navigate(sub.path); setOpenFor(null); }}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}