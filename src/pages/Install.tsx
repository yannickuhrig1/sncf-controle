import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, 
  Smartphone, 
  CheckCircle2, 
  Share, 
  Plus,
  MoreVertical,
  ArrowRight,
  Wifi,
  WifiOff,
  Zap,
  Bell
} from 'lucide-react';
import { motion } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    {
      icon: WifiOff,
      title: 'Mode hors-ligne',
      description: 'Travaillez sans connexion internet'
    },
    {
      icon: Zap,
      title: 'Accès rapide',
      description: 'Lancez l\'app depuis l\'écran d\'accueil'
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Restez informé des mises à jour'
    },
    {
      icon: Wifi,
      title: 'Synchronisation',
      description: 'Vos données sont toujours à jour'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="max-w-md mx-auto space-y-6 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="w-24 h-24 mx-auto bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-4xl">🚆</span>
          </div>
          <h1 className="text-2xl font-bold">SNCF Contrôles</h1>
          <p className="text-muted-foreground">
            Installez l'application pour une expérience optimale
          </p>
        </motion.div>

        {/* Status Card */}
        {isInstalled ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-200">
                      Application installée !
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Vous pouvez la lancer depuis votre écran d'accueil
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Installer l'application
                </CardTitle>
                <CardDescription>
                  Ajoutez SNCF Contrôles à votre écran d'accueil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deferredPrompt ? (
                  <Button onClick={handleInstallClick} className="w-full" size="lg">
                    <Download className="mr-2 h-5 w-5" />
                    Installer maintenant
                  </Button>
                ) : isIOS ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Sur iOS, suivez ces étapes :
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Share className="h-5 w-5 text-primary" />
                        <span className="text-sm">1. Appuyez sur le bouton Partager</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Plus className="h-5 w-5 text-primary" />
                        <span className="text-sm">2. Sélectionnez "Sur l'écran d'accueil"</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <ArrowRight className="h-5 w-5 text-primary" />
                        <span className="text-sm">3. Confirmez en appuyant sur "Ajouter"</span>
                      </div>
                    </div>
                  </div>
                ) : isAndroid ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Sur Android, suivez ces étapes :
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <MoreVertical className="h-5 w-5 text-primary" />
                        <span className="text-sm">1. Ouvrez le menu du navigateur (⋮)</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Smartphone className="h-5 w-5 text-primary" />
                        <span className="text-sm">2. Sélectionnez "Installer l'application"</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <ArrowRight className="h-5 w-5 text-primary" />
                        <span className="text-sm">3. Confirmez l'installation</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    Ouvrez cette page sur votre téléphone pour installer l'application
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold mb-4">Pourquoi installer ?</h2>
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
              >
                <Card className="h-full">
                  <CardContent className="pt-4 text-center">
                    <feature.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="font-medium text-sm">{feature.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Back link */}
        <div className="text-center pt-4">
          <Button variant="ghost" asChild>
            <a href="/">Retour à l'application</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
