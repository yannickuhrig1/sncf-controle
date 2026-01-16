import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Train, Building2, History, User, BarChart3, Settings, Shield, Menu, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences, PageId, DEFAULT_VISIBLE_PAGES } from '@/hooks/useUserPreferences';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  pageId: PageId;
  alwaysVisible?: boolean;
  adminOnly?: boolean;
  managerOnly?: boolean;
}

const allNavItems: NavItem[] = [
  { href: '/', icon: LayoutDashboard, label: 'Accueil', pageId: 'dashboard' },
  { href: '/onboard', icon: Train, label: 'À bord', pageId: 'onboard' },
  { href: '/station', icon: Building2, label: 'En gare', pageId: 'station' },
  { href: '/statistics', icon: BarChart3, label: 'Stats', pageId: 'statistics' },
  { href: '/history', icon: History, label: 'Historique', pageId: 'history' },
  { href: '/manager', icon: UserCheck, label: 'Manager', pageId: 'manager', managerOnly: true, alwaysVisible: true },
  { href: '/settings', icon: Settings, label: 'Paramètres', pageId: 'settings', alwaysVisible: true },
  { href: '/admin', icon: Shield, label: 'Admin', pageId: 'admin', adminOnly: true, alwaysVisible: true },
  { href: '/profile', icon: User, label: 'Profil', pageId: 'profile', alwaysVisible: true },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { profile, isManager, isAdmin } = useAuth();
  const { preferences } = useUserPreferences();
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Detect scroll for header glass effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isUserAdmin = isAdmin();
  const isUserManager = isManager();
  const navigationStyle = preferences?.navigation_style || 'bottom';
  const visiblePages = preferences?.visible_pages || DEFAULT_VISIBLE_PAGES;

  // Filter and order nav items based on visibility, role, and user preference order
  const navItems = (() => {
    // Separate always-visible items from orderable ones
    const alwaysVisibleItems = allNavItems.filter(item => {
      if (item.adminOnly && !isUserAdmin) return false;
      if (item.managerOnly && !isUserManager && !isUserAdmin) return false;
      return item.alwaysVisible;
    });
    
    const orderableItems = allNavItems.filter(item => {
      if (item.adminOnly) return false;
      if (item.managerOnly) return false;
      if (item.alwaysVisible) return false;
      return visiblePages.includes(item.pageId);
    });
    
    // Sort orderable items by the order in visiblePages
    const sortedOrderableItems = [...orderableItems].sort((a, b) => {
      const indexA = visiblePages.indexOf(a.pageId);
      const indexB = visiblePages.indexOf(b.pageId);
      return indexA - indexB;
    });
    
    return [...sortedOrderableItems, ...alwaysVisibleItems];
  })();

  const renderNavLinks = (isBurger = false) => (
    <>
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => isBurger && setBurgerOpen(false)}
            className={cn(
              isBurger 
                ? 'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors'
                : 'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
              isActive 
                ? isBurger 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className={cn('h-5 w-5', isActive && !isBurger && 'text-primary')} />
            <span className={isBurger ? 'font-medium' : 'text-xs'}>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className={cn('min-h-screen flex flex-col', navigationStyle === 'bottom' && 'pb-20')}>
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
          
          {/* Burger Menu Button */}
          {navigationStyle === 'burger' && (
            <Sheet open={burgerOpen} onOpenChange={setBurgerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/90">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <Train className="h-5 w-5 text-primary" />
                    Navigation
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-2">
                  {renderNavLinks(true)}
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6">
        {children}
      </main>

      {/* Bottom Navigation - Glass Effect */}
      {navigationStyle === 'bottom' && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass-frosted border-t border-border/50 dark:border-white/10 safe-area-inset-bottom">
          <div className="flex justify-around items-center h-16">
            {renderNavLinks(false)}
          </div>
        </nav>
      )}
    </div>
  );
}
