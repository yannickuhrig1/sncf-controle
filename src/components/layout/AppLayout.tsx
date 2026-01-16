import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Train, Building2, History, User, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface AppLayoutProps {
  children: ReactNode;
}

const baseNavItems = [
  { href: '/', icon: LayoutDashboard, label: 'Accueil' },
  { href: '/onboard', icon: Train, label: 'À bord' },
  { href: '/station', icon: Building2, label: 'En gare' },
  { href: '/statistics', icon: BarChart3, label: 'Stats' },
  { href: '/history', icon: History, label: 'Historique' },
];

const adminNavItem = { href: '/admin', icon: Settings, label: 'Admin' };
const profileNavItem = { href: '/profile', icon: User, label: 'Profil' };

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { profile } = useAuth();

  const isUserAdmin = profile?.role === 'admin';

  const navItems = isUserAdmin 
    ? [...baseNavItems, adminNavItem, profileNavItem]
    : [...baseNavItems, profileNavItem];

  return (
    <div className="min-h-screen flex flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="flex items-center justify-center gap-2 px-4 py-3">
          <Train className="h-5 w-5" />
          <span className="font-semibold">SNCF Contrôles</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
