import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, Smartphone, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallAppButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
}

export function InstallAppButton({ 
  variant = 'outline', 
  size = 'default',
  className,
  showLabel = true 
}: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (error) {
      console.error('Error installing app:', error);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  // If already installed, show installed state
  if (isInstalled) {
    return (
      <Button 
        variant="ghost" 
        size={size} 
        className={cn("text-primary", className)}
        disabled
      >
        <Check className="h-4 w-4" />
        {showLabel && <span className="ml-2">Installée</span>}
      </Button>
    );
  }

  // If can install natively
  if (deferredPrompt) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleInstall}
        disabled={isInstalling}
      >
        <Download className={cn("h-4 w-4", isInstalling && "animate-bounce")} />
        {showLabel && <span className="ml-2">{isInstalling ? 'Installation...' : 'Installer'}</span>}
      </Button>
    );
  }

  // Fallback: Link to install page with instructions
  return (
    <Button 
      variant={variant} 
      size={size} 
      className={className} 
      asChild
    >
      <Link to="/install">
        <Smartphone className="h-4 w-4" />
        {showLabel && <span className="ml-2">Installer</span>}
      </Link>
    </Button>
  );
}
