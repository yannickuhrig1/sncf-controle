import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Info,
  Train,
  Ticket,
  AlertTriangle,
  FileText,
  Users,
  HelpCircle,
  BookOpen,
  Shield,
  Phone,
  Mail,
  ExternalLink,
  Calculator,
  Clock,
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function InfosUtilesPage() {
  const { user, loading: authLoading } = useAuth();
  const { settings, isLoading: settingsLoading } = useAdminSettings();

  // Check if infos page is hidden
  const hideInfosPage = settings?.find(s => s.key === 'hide_infos_page')?.value === true;

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (hideInfosPage) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Info className="h-6 w-6 text-primary" />
            Infos utiles
          </h1>
          <p className="text-muted-foreground">
            Guides, procédures et informations pour les contrôleurs
          </p>
        </div>

        {/* Quick Reference Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Calcul du taux de fraude
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="text-muted-foreground">
                Le taux de fraude est calculé ainsi :
              </p>
              <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs">
                (Tarifs contrôle + PV + RI négatifs) / Passagers × 100
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Note :</strong> Les tarifs à bord et les RI positifs ne comptent pas dans le taux de fraude.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Horaires de service
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Lundi - Vendredi</span>
                <span className="font-medium">6h00 - 22h00</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Samedi</span>
                <span className="font-medium">7h00 - 21h00</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Dimanche</span>
                <span className="font-medium">8h00 - 20h00</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tarif Types Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              Types de tarification
            </CardTitle>
            <CardDescription>
              Référence des différents types de tarifs applicables
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Badge variant="outline">Tarifs à bord</Badge>
                </h4>
                <p className="text-sm text-muted-foreground">
                  Régularisation volontaire du voyageur avant contrôle. Ne compte pas dans le taux de fraude.
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Badge variant="secondary">Tarifs contrôle</Badge>
                </h4>
                <p className="text-sm text-muted-foreground">
                  Régularisation lors du contrôle. Compte dans le taux de fraude.
                </p>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h4 className="font-semibold text-sm">Catégories de tarifs</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-muted/30 p-3 rounded-lg">
                  <span className="font-medium">STT 50€</span>
                  <p className="text-xs text-muted-foreground mt-1">Sans Titre de Transport - Tarif réduit</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <span className="font-medium">STT 100€</span>
                  <p className="text-xs text-muted-foreground mt-1">Sans Titre de Transport - PV</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <span className="font-medium">RNV</span>
                  <p className="text-xs text-muted-foreground mt-1">Régularisation Non Valide</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <span className="font-medium">Titre tiers</span>
                  <p className="text-xs text-muted-foreground mt-1">Utilisation d'un titre au nom d'un tiers</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <span className="font-medium">D. naissance</span>
                  <p className="text-xs text-muted-foreground mt-1">Fraude sur la date de naissance</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <span className="font-medium">RI+/RI-</span>
                  <p className="text-xs text-muted-foreground mt-1">Relevé d'identité (positif/négatif)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Questions fréquentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  Comment saisir un contrôle hors ligne ?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  L'application fonctionne en mode hors ligne. Vos contrôles sont enregistrés localement 
                  et synchronisés automatiquement dès que la connexion est rétablie. Un indicateur 
                  dans l'en-tête vous montre le nombre de contrôles en attente de synchronisation.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>
                  Quelle est la différence entre RI+ et RI- ?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <strong>RI+ (positif)</strong> : Le voyageur a présenté une pièce d'identité valide lors du contrôle. 
                  Ne compte pas comme fraude.<br />
                  <strong>RI- (négatif)</strong> : Le voyageur n'a pas pu présenter de pièce d'identité valide. 
                  Compte dans le taux de fraude.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>
                  Comment modifier un contrôle déjà enregistré ?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Rendez-vous dans l'historique des contrôles, cliquez sur le contrôle à modifier, 
                  puis utilisez le bouton "Modifier" dans le dialogue de détails. 
                  Vous pouvez également dupliquer un contrôle pour créer une nouvelle entrée similaire.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>
                  Comment exporter mes contrôles ?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Utilisez le bouton "Exporter" disponible dans l'en-tête des pages de contrôle 
                  ou dans l'historique. Vous pouvez filtrer par période (jour, semaine, mois, année) 
                  et choisir le format d'export (HTML ou PDF).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>
                  Comment sont calculés les seuils de couleur du taux de fraude ?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Les seuils sont configurables par l'administrateur. Par défaut :<br />
                  <span className="text-success">Vert</span> : Taux &lt; 5%<br />
                  <span className="text-warning">Jaune</span> : Taux entre 5% et 10%<br />
                  <span className="text-destructive">Rouge</span> : Taux ≥ 10%
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Contacts utiles
            </CardTitle>
            <CardDescription>
              Numéros publics SNCF et contacts internes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Public SNCF Numbers */}
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Badge variant="outline">Numéros publics SNCF</Badge>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">SNCF Voyageurs</p>
                    <a href="tel:3635" className="text-sm text-primary hover:underline">3635</a>
                    <p className="text-xs text-muted-foreground">Service clients (0,40€/min)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Objets trouvés</p>
                    <a href="tel:0155317949" className="text-sm text-primary hover:underline">01 55 31 79 49</a>
                    <p className="text-xs text-muted-foreground">Du lundi au vendredi 9h-17h</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Accessibilité</p>
                    <a href="tel:0890640650" className="text-sm text-primary hover:underline">0890 640 650</a>
                    <p className="text-xs text-muted-foreground">Accès Plus (0,12€/min)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <ExternalLink className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Site SNCF</p>
                    <a 
                      href="https://www.sncf-voyageurs.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      sncf-voyageurs.com
                    </a>
                    <p className="text-xs text-muted-foreground">Informations voyageurs</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Internal Contacts */}
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Badge variant="secondary">Contacts internes</Badge>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Chef d'équipe</p>
                    <p className="text-sm text-muted-foreground">Voir page Manager</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Sûreté ferroviaire</p>
                    <a href="tel:0800405040" className="text-sm text-primary hover:underline">0 800 40 50 40</a>
                    <p className="text-xs text-muted-foreground">N° vert 24h/24</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium text-sm">Urgences</p>
                    <div className="flex gap-2 text-sm">
                      <a href="tel:112" className="text-primary hover:underline font-medium">112</a>
                      <span className="text-muted-foreground">|</span>
                      <a href="tel:15" className="text-primary hover:underline">15 (SAMU)</a>
                      <span className="text-muted-foreground">|</span>
                      <a href="tel:17" className="text-primary hover:underline">17 (Police)</a>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Support application</p>
                    <a href="mailto:controle-app@sncf.fr" className="text-sm text-primary hover:underline">
                      controle-app@sncf.fr
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Documentation */}
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Badge variant="outline">Ressources</Badge>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Documentation interne</p>
                    <p className="text-xs text-muted-foreground">Intranet SNCF &gt; Espace contrôle</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Guide tarifaire</p>
                    <p className="text-xs text-muted-foreground">Disponible sur l'intranet</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
