import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Phone, ArrowLeft, Mail } from 'lucide-react';

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      toast.error('Erreur de connexion', { description: error.message });
    } else {
      toast.success('Connexion réussie', { description: 'Bienvenue sur SNCF Contrôles' });
    }

    setIsSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setIsSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error('Erreur', { description: error.message });
    } else {
      setResetSent(true);
    }

    setIsSubmitting(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Erreur', { description: 'Veuillez remplir tous les champs obligatoires' });
      setIsSubmitting(false);
      return;
    }

    const { error } = await signUp(registerEmail, registerPassword, {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: phoneNumber.trim() || undefined,
    });

    if (error) {
      toast.error("Erreur d'inscription", { description: error.message });
    } else {
      // Notify admins/managers of new signup
      try {
        await supabase.functions.invoke('notify-new-signup', {
          headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          body: { user_name: `${firstName} ${lastName}`, user_email: registerEmail },
        });
      } catch (e) {
        console.error('Failed to send signup notification:', e);
      }

      toast.success('Inscription réussie', { description: 'Votre compte est en attente de validation par un administrateur. Vous serez notifié une fois approuvé.' });
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Theme-aware glow behind card */}
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
          <Tabs defaultValue="login">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" onClick={() => { setShowForgotPassword(false); setResetSent(false); }}>
                  Connexion
                </TabsTrigger>
                <TabsTrigger value="register">Inscription</TabsTrigger>
              </TabsList>
            </CardHeader>

            {/* ── Connexion ─────────────────────────────────────────────────── */}
            <TabsContent value="login">
              {showForgotPassword ? (
                /* ── Mot de passe oublié ── */
                <div>
                  <CardContent className="space-y-4">
                    <button
                      type="button"
                      onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetEmail(''); }}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Retour à la connexion
                    </button>

                    {resetSent ? (
                      <div className="flex flex-col items-center gap-3 py-6 text-center">
                        <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                          <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="font-medium">Email envoyé !</p>
                        <p className="text-sm text-muted-foreground">
                          Si un compte existe pour <span className="font-medium">{resetEmail}</span>, vous recevrez un lien pour réinitialiser votre mot de passe.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Réinitialiser le mot de passe</p>
                          <p className="text-xs text-muted-foreground">
                            Saisissez votre email pour recevoir un lien de réinitialisation.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">Email</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="agent@sncf.fr"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                            autoFocus
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={isSubmitting || !resetEmail.trim()}>
                          {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi...</>
                          ) : (
                            'Envoyer le lien'
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </div>
              ) : (
                /* ── Formulaire de connexion ── */
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="agent@sncf.fr"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Mot de passe</Label>
                        <button
                          type="button"
                          onClick={() => { setShowForgotPassword(true); setResetEmail(loginEmail); }}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connexion...</>
                      ) : (
                        'Se connecter'
                      )}
                    </Button>
                  </CardFooter>
                </form>
              )}
            </TabsContent>

            {/* ── Inscription ───────────────────────────────────────────────── */}
            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">Prénom</Label>
                      <Input
                        id="first-name"
                        placeholder="Jean"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Nom</Label>
                      <Input
                        id="last-name"
                        placeholder="Dupont"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1.5">
                      Téléphone
                      <span className="text-xs text-muted-foreground font-normal">(facultatif)</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="06 12 34 56 78"
                        className="pl-10"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="agent@sncf.fr"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Mot de passe</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Minimum 6 caractères"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Inscription...</>
                    ) : (
                      "S'inscrire"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
