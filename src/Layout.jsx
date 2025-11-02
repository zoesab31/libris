import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Library, Sparkles, User, Users, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Tableau de bord",
    url: createPageUrl("Dashboard"),
    icon: BookOpen,
  },
  {
    title: "Ma Bibliothèque",
    url: createPageUrl("MyLibrary"),
    icon: Library,
  },
  {
    title: "Découvrir",
    url: createPageUrl("Discover"),
    icon: Sparkles,
  },
  {
    title: "Lectures Communes",
    url: createPageUrl("SharedReadings"),
    icon: Users,
  },
  {
    title: "Mon Profil",
    url: createPageUrl("Profile"),
    icon: User,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --cream: #FBF7F4;
          --beige: #E8DED2;
          --soft-brown: #C4A484;
          --warm-brown: #8B6F47;
          --deep-brown: #5C4033;
          --gold: #D4AF37;
          --rose-gold: #E6C7B8;
        }
      `}</style>
      <div className="min-h-screen flex w-full" style={{ backgroundColor: 'var(--cream)' }}>
        <Sidebar className="border-r" style={{ borderColor: 'var(--beige)' }}>
          <SidebarHeader className="border-b p-6" style={{ borderColor: 'var(--beige)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
                   style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}>
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--deep-brown)' }}>
                  Nos Livres
                </h2>
                <p className="text-xs" style={{ color: 'var(--warm-brown)' }}>
                  Notre bibliothèque partagée
                </p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`mb-1 rounded-xl transition-all duration-200 ${
                          location.pathname === item.url 
                            ? 'text-white shadow-md' 
                            : 'hover:bg-opacity-50'
                        }`}
                        style={location.pathname === item.url ? {
                          background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))'
                        } : {}}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t p-4" style={{ borderColor: 'var(--beige)' }}>
            {user && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                       style={{ background: 'linear-gradient(135deg, var(--soft-brown), var(--rose-gold))' }}>
                    {user.full_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--deep-brown)' }}>
                      {user.full_name || 'Lectrice'}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--warm-brown)' }}>
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ 
                    backgroundColor: 'var(--beige)',
                    color: 'var(--warm-brown)'
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b px-6 py-4 md:hidden" style={{ borderColor: 'var(--beige)' }}>
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-opacity-50 p-2 rounded-lg transition-colors" />
              <h1 className="text-xl font-bold" style={{ color: 'var(--deep-brown)' }}>
                Nos Livres
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}