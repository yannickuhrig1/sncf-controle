import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  LayoutDashboard,
  Building2,
  BarChart3,
  History,
  Settings,
  Share2,
  Copy,
  MessageSquare,
  QrCode,
  Monitor,
  Download,
  CheckCircle2,
  XCircle,
  MapPin,
  Search,
  RefreshCw,
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useStationDepartures } from '@/hooks/useStationDepartures';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Tile {
  id: string;
  icon: React.ElementType;
  label: string;
  gradient: string;
  iconBg: string;
  iconColor: string;
}

/* ─── Tuiles ─────────────────────────────────────────────────────────────── */
const TILES: Tile[] = [
  {
    id: 'about',
    icon: Info,
    label: "À propos de l'app",
    gradient: 'from-primary/80 to-primary',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  {
    id: 'fraude',
    icon: Calculator,
    label: 'Taux de fraude',
    gradient: 'from-blue-400 to-indigo-500',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  {
    id: 'tarifs',
    icon: Ticket,
    label: 'Tarification',
    gradient: 'from-amber-400 to-orange-500',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  {
    id: 'faq',
    icon: HelpCircle,
    label: 'FAQ',
    gradient: 'from-violet-400 to-purple-500',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  {
    id: 'contacts',
    icon: Phone,
    label: 'Contacts',
    gradient: 'from-green-400 to-emerald-500',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  {
    id: 'partager',
    icon: Share2,
    label: "Partager l'app",
    gradient: 'from-teal-400 to-cyan-500',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  {
    id: 'presentation',
    icon: Monitor,
    label: 'Présentation',
    gradient: 'from-rose-400 to-pink-600',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  {
    id: 'departures',
    icon: Train,
    label: 'Départs en gare',
    gradient: 'from-sky-400 to-blue-600',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
];

/* ─── Contenu des dialogs ────────────────────────────────────────────────── */
function ContentAbout() {
  const menus = [
    { icon: LayoutDashboard, label: 'Accueil', desc: 'Tableau de bord du jour : stats en temps réel, taux de fraude, recettes.', color: 'text-primary' },
    { icon: Train, label: 'À bord', desc: "Saisie d'un contrôle en train : passagers, tarifs, PV, RI, trains du jour.", color: 'text-blue-500' },
    { icon: Building2, label: 'En gare', desc: 'Saisie d\'un contrôle en gare ou sur quai, avec trains du jour identiques.', color: 'text-teal-500' },
    { icon: BarChart3, label: 'Statistiques', desc: 'Graphiques détaillés sur une période : fraude, recettes, tendances.', color: 'text-amber-500' },
    { icon: History, label: 'Historique', desc: 'Liste complète des contrôles, filtrage par période, export HTML/PDF.', color: 'text-violet-500' },
    { icon: Settings, label: 'Paramètres', desc: 'Thème, navigation, notifications, luminosité, orientation PDF.', color: 'text-slate-500' },
  ];

  return (
    <div className="space-y-5">
      {/* App header */}
      <div className="flex items-center gap-4">
        <img
          src="/icon-192.png"
          alt="SNCF Contrôles"
          className="w-16 h-16 rounded-2xl shadow-md object-cover shrink-0"
        />
        <div>
          <h2 className="text-lg font-bold">SNCF Contrôles</h2>
          <p className="text-sm text-muted-foreground">
            Application de gestion des contrôles voyageurs pour les agents SNCF.
          </p>
          <div className="flex gap-2 mt-1.5 flex-wrap">
            <Badge variant="secondary">PWA</Badge>
            <Badge variant="secondary">Hors-ligne</Badge>
            <Badge variant="secondary">Supabase</Badge>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        Conçue pour les contrôleurs SNCF, cette application permet de saisir,
        suivre et exporter les contrôles à bord et en gare. Les données sont
        synchronisées en temps réel et accessibles hors ligne.
      </p>

      {/* Menu sections */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Sections de l'application</h3>
        <div className="grid grid-cols-1 gap-2">
          {menus.map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key features */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Fonctionnalités clés</h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Calcul automatique du taux de fraude</li>
          <li>Lookup des trains en temps réel (API SNCF Navitia)</li>
          <li>Export HTML et PDF des rapports</li>
          <li>Mode sombre / thèmes personnalisables</li>
          <li>Navigation personnalisable (sidebar + barre du bas)</li>
          <li>Compatible mobile, tablette et PC</li>
        </ul>
      </div>
    </div>
  );
}

function ContentFraude() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Le taux de fraude est calculé ainsi :</p>
      <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm text-center">
        (Tarifs contrôle + PV + RI négatifs) / Passagers × 100
      </div>
      <div className="space-y-2 text-sm">
        <p className="font-medium">Ce qui <span className="text-destructive">compte</span> dans le taux :</p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>Tarifs contrôle (STT 50€, 100€, 200€, etc.)</li>
          <li>Procès-verbaux (PV)</li>
          <li>RI négatifs (sans pièce d'identité)</li>
        </ul>
        <p className="font-medium mt-3">Ce qui <span className="text-green-600">ne compte pas</span> :</p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>Tarifs à bord (billet vendu volontairement avant contrôle)</li>
          <li>RI positifs (pièce d'identité valide présentée)</li>
        </ul>
      </div>
      <div className="text-sm border rounded-lg p-3 space-y-1">
        <p className="font-medium">Seuils de couleur (par défaut) :</p>
        <p><span className="text-green-600 font-medium">Vert</span> — Taux &lt; 5 %</p>
        <p><span className="text-yellow-600 font-medium">Jaune</span> — Taux entre 5 % et 10 %</p>
        <p><span className="text-destructive font-medium">Rouge</span> — Taux ≥ 10 %</p>
      </div>
    </div>
  );
}

function ContentTarifs() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <div className="p-3 bg-muted/30 rounded-lg">
          <Badge variant="outline" className="mb-1.5">Tarifs à bord</Badge>
          <p className="text-sm text-muted-foreground">
            Régularisation volontaire avant contrôle. <strong>Ne compte pas</strong> dans le taux de fraude.
          </p>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg">
          <Badge variant="secondary" className="mb-1.5">Tarifs contrôle</Badge>
          <p className="text-sm text-muted-foreground">
            Régularisation lors du contrôle. <strong>Compte</strong> dans le taux de fraude.
          </p>
        </div>
      </div>

      <h4 className="font-semibold text-sm">Catégories</h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {[
          { code: 'STT 50€', desc: 'Supplément Train Tarif' },
          { code: 'STT 100€', desc: 'PV standard' },
          { code: 'RNV', desc: 'Régularisation Non Valide' },
          { code: 'Titre tiers', desc: "Titre au nom d'un tiers" },
          { code: 'D. naissance', desc: 'Fraude date de naissance' },
          { code: 'RI+ / RI-', desc: "Relevé d'identité +/-" },
        ].map(({ code, desc }) => (
          <div key={code} className="bg-muted/30 p-2.5 rounded-lg">
            <span className="font-medium text-xs">{code}</span>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentFAQ() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {[
        {
          q: 'Comment saisir un contrôle hors ligne ?',
          a: "L'application fonctionne en mode hors ligne. Vos contrôles sont enregistrés localement et synchronisés automatiquement dès que la connexion est rétablie.",
        },
        {
          q: 'Quelle est la différence entre RI+ et RI- ?',
          a: 'RI+ : pièce d\'identité valide → ne compte pas comme fraude. RI- : pas de pièce d\'identité valide → compte dans le taux de fraude.',
        },
        {
          q: 'Comment modifier un contrôle déjà enregistré ?',
          a: 'Rendez-vous dans l\'Historique, cliquez sur le contrôle puis utilisez le bouton "Modifier".',
        },
        {
          q: 'Comment exporter mes contrôles ?',
          a: 'Utilisez le bouton "Exporter" dans l\'Historique ou sur les pages de contrôle. Formats disponibles : HTML et PDF.',
        },
        {
          q: 'Comment sont calculés les seuils de couleur ?',
          a: 'Configurables par l\'admin. Par défaut : Vert < 5%, Jaune 5-10%, Rouge ≥ 10%.',
        },
      ].map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger className="text-sm text-left">{item.q}</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function ContentContacts() {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Numéros publics SNCF</h4>
      <div className="grid grid-cols-1 gap-2">
        {[
          { label: 'SNCF Voyageurs', num: '3635', info: '0,40€/min', tel: '3635' },
          { label: 'Objets trouvés', num: '01 55 31 79 49', info: 'Lun-Ven 9h-17h', tel: '0155317949' },
          { label: 'Accessibilité', num: '0890 640 650', info: 'Accès Plus (0,12€/min)', tel: '0890640650' },
        ].map(({ label, num, info, tel }) => (
          <div key={label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Phone className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{label}</p>
              <a href={`tel:${tel}`} className="text-sm text-primary hover:underline">{num}</a>
              <p className="text-xs text-muted-foreground">{info}</p>
            </div>
          </div>
        ))}
      </div>

      <h4 className="text-sm font-semibold pt-2">Contacts internes</h4>
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
          <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">Sûreté ferroviaire</p>
            <a href="tel:0800405040" className="text-sm text-primary hover:underline">0 800 40 50 40</a>
            <p className="text-xs text-muted-foreground">N° vert 24h/24</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-medium">Urgences</p>
            <div className="flex gap-2 text-sm">
              <a href="tel:112" className="text-primary hover:underline font-medium">112</a>
              <span className="text-muted-foreground">·</span>
              <a href="tel:15" className="text-primary hover:underline">15 SAMU</a>
              <span className="text-muted-foreground">·</span>
              <a href="tel:17" className="text-primary hover:underline">17 Police</a>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">Support application</p>
            <a href="mailto:controle-app@sncf.fr" className="text-sm text-primary hover:underline">
              controle-app@sncf.fr
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentPartager() {
  const appUrl   = window.location.origin;
  const qrSrc    = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}`;
  const smsBody  = encodeURIComponent(`SNCF Contrôles — Application de gestion des contrôles : ${appUrl}`);
  const mailSub  = encodeURIComponent('SNCF Contrôles — Application');
  const mailBody = encodeURIComponent(`Bonjour,\n\nVoici le lien vers l'application SNCF Contrôles :\n${appUrl}\n\nElle permet de saisir et exporter les contrôles à bord et en gare.`);

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Partagez l'application SNCF Contrôles avec vos collègues via QR code, SMS ou email.
      </p>

      {/* QR Code */}
      <div className="flex flex-col items-center gap-2">
        <img
          src={qrSrc}
          alt="QR Code SNCF Contrôles"
          width={180}
          height={180}
          className="rounded-xl border shadow-sm"
        />
        <p className="text-xs text-muted-foreground">Scannez pour ouvrir l'app</p>
      </div>

      {/* URL */}
      <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
        <span className="text-xs text-muted-foreground truncate flex-1">{appUrl}</span>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
          <Copy className="h-3.5 w-3.5" />
          {copied ? 'Copié !' : 'Copier le lien'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => window.open(`sms:?body=${smsBody}`)}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          SMS
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => window.open(`mailto:?subject=${mailSub}&body=${mailBody}`)}
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </Button>
        {typeof navigator !== 'undefined' && navigator.share && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => navigator.share({ title: 'SNCF Contrôles', url: appUrl })}
          >
            <Share2 className="h-3.5 w-3.5" />
            Partager
          </Button>
        )}
      </div>
    </div>
  );
}

function ContentPresentation() {
  const presentationUrl = `${window.location.origin}/presentation_sncf_controles.html`;
  const mailSub  = encodeURIComponent('SNCF Contrôles — Présentation de l\'application');
  const mailBody = encodeURIComponent(
    `Bonjour,\n\nVeuillez trouver ci-dessous le lien vers la présentation de l'application SNCF Contrôles :\n\n${presentationUrl}\n\nCette présentation détaille les fonctionnalités de l'outil de gestion des contrôles voyageurs.`
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Présentation complète de l'application SNCF Contrôles : fonctionnalités, architecture,
        guide d'utilisation. À partager avec votre équipe ou votre hiérarchie.
      </p>

      {/* Aperçu */}
      <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800">
        <div className="p-2.5 bg-rose-100 dark:bg-rose-900/40 rounded-lg shrink-0">
          <Monitor className="h-6 w-6 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">Présentation interactive</p>
          <p className="text-xs text-muted-foreground">Document HTML — slides animées</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 gap-2">
        <Button
          className="w-full gap-2"
          onClick={() => window.open(presentationUrl, '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          Ouvrir la présentation
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2"
          asChild
        >
          <a href="/presentation_sncf_controles.html" download="presentation_sncf_controles.html">
            <Download className="h-4 w-4" />
            Télécharger (HTML)
          </a>
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => window.open(`mailto:?subject=${mailSub}&body=${mailBody}`)}
        >
          <Mail className="h-4 w-4" />
          Envoyer par email
        </Button>
      </div>
    </div>
  );
}

function ContentDepartures() {
  const [station, setStation] = useState('');
  const { fetchDepartures, isLoading, error, departures, stationName } = useStationDepartures();

  const load = () => { if (station.trim()) fetchDepartures(station); };

  return (
    <div className="space-y-4">
      {/* Recherche */}
      <div className="flex gap-2">
        <Input
          placeholder="Nom de gare (ex : Paris Lyon)..."
          value={station}
          onChange={e => setStation(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          className="flex-1"
        />
        <Button type="button" size="icon" onClick={load} disabled={isLoading || !station.trim()}>
          {isLoading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {stationName && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Départs · <span className="font-medium">{stationName}</span>
          </p>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} disabled={isLoading}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {error && !isLoading && (
        <p className="text-sm text-destructive text-center py-4">{error}</p>
      )}
      {!isLoading && !error && departures.length === 0 && stationName && (
        <p className="text-sm text-muted-foreground text-center py-4">Aucun départ trouvé</p>
      )}

      <div className="space-y-1">
        {departures.map((dep, i) => (
          <div
            key={`${dep.trainNumber}-${i}`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/30"
          >
            <div className="w-14 shrink-0 text-center">
              <div className={`text-sm font-bold tabular-nums ${dep.status === 'cancelled' ? 'line-through text-muted-foreground' : ''}`}>
                {dep.scheduledTime}
              </div>
              {dep.delayMinutes > 0 && (
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  +{dep.delayMinutes} min
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {dep.trainType && (
                  <Badge variant="outline" className="text-xs h-5 px-1.5 font-medium border-muted-foreground/30">
                    {dep.trainType}
                  </Badge>
                )}
                <span className="text-sm font-semibold">{dep.trainNumber}</span>
                {dep.platform && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />V{dep.platform}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">→ {dep.direction}</div>
            </div>
            <div className="shrink-0">
              {dep.status === 'on_time'   && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {dep.status === 'delayed'   && <AlertTriangle className="h-5 w-5 text-amber-500" />}
              {dep.status === 'cancelled' && <XCircle       className="h-5 w-5 text-red-500" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DIALOG_CONTENT: Record<string, { title: string; Content: () => JSX.Element }> = {
  about:     { title: "À propos de l'application", Content: ContentAbout },
  fraude:    { title: 'Calcul du taux de fraude',   Content: ContentFraude },
  tarifs:    { title: 'Types de tarification',       Content: ContentTarifs },
  faq:       { title: 'Questions fréquentes',        Content: ContentFAQ },
  contacts:  { title: 'Contacts utiles',             Content: ContentContacts },
  partager:      { title: "Partager l'application",     Content: ContentPartager },
  presentation:  { title: 'Présentation de l\'application', Content: ContentPresentation },
  departures:    { title: 'Départs en gare',                Content: ContentDepartures },
};

/* ─── Page principale ────────────────────────────────────────────────────── */
export default function InfosUtilesPage() {
  const { user, loading: authLoading } = useAuth();
  const { settings, isLoading: settingsLoading } = useAdminSettings();
  const [openTile, setOpenTile] = useState<string | null>(null);

  const hideInfosPage = settings?.find(s => s.key === 'hide_infos_page')?.value === true;

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (hideInfosPage) return <Navigate to="/" replace />;

  const dialogDef = openTile ? DIALOG_CONTENT[openTile] : null;

  return (
    <AppLayout>
      <div className="space-y-5 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Infos utiles
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Guides, procédures et informations pour les contrôleurs
          </p>
        </div>

        {/* Grille de tuiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <Card
                key={tile.id}
                onClick={() => setOpenTile(tile.id)}
                className="cursor-pointer border-0 shadow-sm overflow-hidden hover:shadow-md transition-shadow active:scale-95 transition-transform select-none"
              >
                <div className={`bg-gradient-to-br ${tile.gradient} p-5 flex flex-col items-center gap-3 text-white`}>
                  <div className={`p-3 rounded-2xl ${tile.iconBg}`}>
                    <Icon className={`h-6 w-6 ${tile.iconColor}`} />
                  </div>
                  <span className="text-sm font-semibold text-center leading-tight">
                    {tile.label}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Dialog */}
        <Dialog open={!!openTile} onOpenChange={(open) => !open && setOpenTile(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{dialogDef?.title}</DialogTitle>
            </DialogHeader>
            {dialogDef && <dialogDef.Content />}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
