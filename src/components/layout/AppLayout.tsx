import { ReactNode, useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Train, Building2, History, User, BarChart3, Settings, Shield, Menu, UserCheck, Wifi, WifiOff, Download, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences, PageId, DEFAULT_VISIBLE_PAGES, DEFAULT_BOTTOM_BAR_PAGES } from '@/hooks/useUserPreferences';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InstallAppButton } from '@/components/InstallAppButton';
interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  pageId: PageId;
  adminOnly?: boolean;
  managerOnly?: boolean;
}

const allNavItems: NavItem[] = [
  { href: '/', icon: LayoutDashboard, label: 'Accueil', pageId: 'dashboard' },
  { href: '/onboard', icon: Train, label: 'À bord', pageId: 'onboard' },
  { href: '/station', icon: Building2, label: 'En gare', pageId: 'station' },
  { href: '/statistics', icon: BarChart3, label: 'Stats', pageId: 'statistics' },
  { href: '/history', icon: History, label: 'Historique', pageId: 'history' },
  { href: '/infos', icon: Info, label: 'Infos', pageId: 'infos' },
  { href: '/manager', icon: UserCheck, label: 'Manager', pageId: 'manager', managerOnly: true },
  { href: '/settings', icon: Settings, label: 'Paramètres', pageId: 'settings' },
  { href: '/admin', icon: Shield, label: 'Admin', pageId: 'admin', adminOnly: true },
  { href: '/profile', icon: User, label: 'Profil', pageId: 'profile' },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { profile, isManager, isAdmin, user } = useAuth();
  const { preferences } = useUserPreferences();
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Detect scroll for header glass effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if infos page is hidden by admin
  const { data: adminSettings = [] } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings' as any)
        .select('*');
      if (error) return [];
      return (data || []) as unknown as Array<{ key: string; value: any }>;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const hideInfosPage = adminSettings.find(s => s.key === 'hide_infos_page')?.value === true;

  // Fetch pending approval count for admin badge
  const { data: pendingApprovalCount = 0 } = useQuery({
    queryKey: ['pending-approvals-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false);
      if (error) return 0;
      return count || 0;
    },
    enabled: isAdmin() || isManager(),
    refetchInterval: 30000, // Refresh every 30s
  });

  const isUserAdmin = isAdmin();
  const isUserManager = isManager();
  const showBottomBar = preferences?.show_bottom_bar ?? true;
  const showBurgerMenu = preferences?.show_burger_menu ?? false;
  const visiblePages = preferences?.visible_pages || DEFAULT_VISIBLE_PAGES;
  const bottomBarPages = preferences?.bottom_bar_pages || DEFAULT_BOTTOM_BAR_PAGES;

  // Filter and order nav items for burger menu
  const burgerNavItems = (() => {
    const allowedItems = allNavItems.filter(item => {
      if (item.adminOnly && !isUserAdmin) return false;
      if (item.managerOnly && !isUserManager && !isUserAdmin) return false;
      if (item.pageId === 'infos' && hideInfosPage) return false;
      return visiblePages.includes(item.pageId);
    });

    return [...allowedItems].sort((a, b) => {
      const indexA = visiblePages.indexOf(a.pageId);
      const indexB = visiblePages.indexOf(b.pageId);
      return indexA - indexB;
    });
  })();

  // Filter and order nav items for bottom bar
  const bottomNavItems = (() => {
    const allowedItems = allNavItems.filter(item => {
      if (item.adminOnly && !isUserAdmin) return false;
      if (item.managerOnly && !isUserManager && !isUserAdmin) return false;
      if (item.pageId === 'infos' && hideInfosPage) return false;
      return bottomBarPages.includes(item.pageId);
    });

    return [...allowedItems].sort((a, b) => {
      const indexA = bottomBarPages.indexOf(a.pageId);
      const indexB = bottomBarPages.indexOf(b.pageId);
      return indexA - indexB;
    });
  })();

  const renderBurgerLinks = () => (
    <>
      {burgerNavItems.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <motion.div
            key={item.href}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <Link
              to={item.href}
              onClick={() => setBurgerOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.pageId === 'admin' && pendingApprovalCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-4 min-w-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                    {pendingApprovalCount}
                  </span>
                )}
              </div>
              <span className="font-medium">{item.label}</span>
            </Link>
          </motion.div>
        );
      })}
    </>
  );

  const renderBottomNavLinks = () => (
    <>
      {bottomNavItems.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <motion.div
            key={item.href}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="flex flex-col items-center justify-center flex-1 h-full relative"
          >
            <Link
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors w-full h-full',
                isActive 
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                {item.pageId === 'admin' && pendingApprovalCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-4 min-w-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                    {pendingApprovalCount}
                  </span>
                )}
              </div>
              <span className="text-xs">{item.label}</span>
            </Link>
          </motion.div>
        );
      })}
    </>
  );

  return (
    <div className={cn('min-h-screen flex flex-col', showBottomBar && 'pb-20')}>
      {/* Header - Glass Effect on Scroll */}
      <header 
        className={cn(
          "sticky top-0 z-40 transition-all duration-300",
          isScrolled 
            ? "bg-primary/90 backdrop-blur-md shadow-lg dark:bg-primary/80" 
            : "bg-primary",
          "text-primary-foreground"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Train className="h-5 w-5" />
            <span className="font-semibold">SNCF Contrôles</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Connection Status Indicator */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10",
                  (!isOnline || !user) && "animate-pulse"
                )}>
                  {isOnline && user ? (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-2 w-2 rounded-full bg-green-400"
                      />
                      <Wifi className="h-3.5 w-3.5 text-green-400" />
                    </>
                  ) : isOnline && !user ? (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ 
                          scale: [1, 1.2, 1],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="h-2 w-2 rounded-full bg-yellow-400"
                      />
                      <Wifi className="h-3.5 w-3.5 text-yellow-400" />
                    </>
                  ) : (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ 
                          scale: [1, 1.3, 1],
                          opacity: [1, 0.5, 1]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="h-2 w-2 rounded-full bg-red-400"
                      />
                      <motion.div
                        animate={{ 
                          opacity: [1, 0.5, 1]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <WifiOff className="h-3.5 w-3.5 text-red-400" />
                      </motion.div>
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isOnline && user ? (
                  <p>Connecté à Supabase</p>
                ) : isOnline && !user ? (
                  <p>En ligne - Non authentifié</p>
                ) : (
                  <p>Hors ligne</p>
                )}
              </TooltipContent>
            </Tooltip>

            {/* Burger Menu Button - Always visible if enabled */}
            {showBurgerMenu && (
              <Sheet open={burgerOpen} onOpenChange={setBurgerOpen}>
                <SheetTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/90">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="flex items-center gap-2">
                      <Train className="h-5 w-5 text-primary" />
                      Navigation
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-1 p-2">
                    {renderBurgerLinks()}
                  </nav>
                  <div className="p-4 border-t mt-auto">
                    <InstallAppButton variant="outline" className="w-full" />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6">
        {children}
      </main>

      {/* Bottom Navigation - Glass Effect */}
      {showBottomBar && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass-frosted border-t border-border/50 dark:border-white/10 safe-area-inset-bottom">
          <div className="flex justify-around items-center h-16">
            {renderBottomNavLinks()}
          </div>
        </nav>
      )}
    </div>
  );
}
