import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady]           = useState(false);
  const [isDone, setIsDone]             = useState(false);

  // Supabase envoie le token dans le hash → écouter l'événement PASSWORD_RECOVERY
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      toast.error('Erreur', { description: error.message });
    } else {
      setIsDone(true);
      setTimeout(() => navigate('/auth'), 3000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="auth-card-glow absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/icon-192.png" alt="SNCF Contrôles" className="h-14 w-14 rounded-2xl shadow-md" />
          <div>
            <h1 className="text-2xl font-bold">SNCF Contrôles</h1>
            <p className="text-sm text-muted-foreground">Gestion des contrôles voyageurs</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-primary" />
              Nouveau mot de passe
            </CardTitle>
            <CardDescription>
              Choisissez un nouveau mot de passe pour votre compte.
            </CardDescription>
          </CardHeader>

          {isDone ? (
            <CardContent>
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="font-medium">Mot de passe modifié !</p>
                <p className="text-sm text-muted-foreground">
                  Vous allez être redirigé vers la page de connexion…
                </p>
              </div>
            </CardContent>
          ) : !isReady ? (
            <CardContent>
              <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Vérification du lien en cours…</p>
                <p className="text-xs">Si rien ne se passe, le lien est peut-être expiré.</p>
                <Button variant="link" size="sm" onClick={() => navigate('/auth')}>
                  Retour à la connexion
                </Button>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Minimum 6 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Répétez le mot de passe"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isSubmitting || !password || !confirm}>
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</>
                  ) : (
                    'Enregistrer le nouveau mot de passe'
                  )}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
