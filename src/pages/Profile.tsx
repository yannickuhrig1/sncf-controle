import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2, User, BadgeCheck, Shield, LogOut, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export default function ProfilePage() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [matricule, setMatricule] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? '');
    setLastName(profile.last_name ?? '');
    setMatricule(profile.matricule ?? '');
    setPhoneNumber(profile.phone_number ?? '');
  }, [profile?.id]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          matricule: matricule.trim() || null,
          phone_number: phoneNumber.trim() || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Profil mis à jour', { description: 'Vos informations ont été enregistrées' });

      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error: any) {
      toast.error('Erreur', { description: error.message || 'Impossible de mettre à jour le profil' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast('Déconnexion — À bientôt !');
  };

  const roleLabels = {
    agent: 'Agent',
    manager: 'Manager',
    admin: 'Administrateur',
  };

  const roleColors = {
    agent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const initials = `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();

  const roleGradients = {
    agent:   'from-blue-500 to-blue-600',
    manager: 'from-violet-500 to-purple-600',
    admin:   'from-red-500 to-rose-600',
  };

  return (
    <AppLayout>
      <div className="space-y-5 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Mon profil
            </h1>
            <p className="text-sm text-muted-foreground">Gérez vos informations personnelles</p>
          </div>
        </div>

        {/* Profile Hero Card */}
        <Card className="border-0 shadow-md overflow-hidden">
          <div className={cn("h-20 bg-gradient-to-br", roleGradients[profile.role])} />
          <CardContent className="pt-0 pb-5 px-5">
            <div className="flex flex-col items-center text-center -mt-10">
              <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg mb-3">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className={cn("text-lg text-white bg-gradient-to-br", roleGradients[profile.role])}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-bold">{profile.first_name} {profile.last_name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex gap-2 mt-3">
                <Badge className={roleColors[profile.role]}>
                  <Shield className="h-3 w-3 mr-1" />
                  {roleLabels[profile.role]}
                </Badge>
                {profile.matricule && (
                  <Badge variant="outline">
                    <BadgeCheck className="h-3 w-3 mr-1" />
                    {profile.matricule}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
          <CardHeader className="py-3 px-4 pb-2">
            <CardTitle className="text-sm font-semibold">Informations personnelles</CardTitle>
            <CardDescription className="text-xs">
              Modifiez vos informations de profil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone (optionnel)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="matricule">Matricule SNCF (optionnel)</Label>
                <Input
                  id="matricule"
                  placeholder="123456"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Se déconnecter
        </Button>
      </div>
    </AppLayout>
  );
}
