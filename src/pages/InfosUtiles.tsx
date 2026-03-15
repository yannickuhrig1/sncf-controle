import { useState, useEffect, useRef } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Info,
  Train,
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
  ChevronRight,
  LifeBuoy,
  Paperclip,
  Send,
  Loader2,
} from 'lucide-react';
import { DeparturesWidget } from '@/components/controls/DeparturesWidget';
import { useWantedPersons } from '@/hooks/useWantedPersons';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    id: 'fraude',
    icon: Calculator,
    label: 'Taux de fraude',
    gradient: 'from-blue-400 to-indigo-500',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  {
    id: 'wanted',
    icon: AlertTriangle,
    label: 'Personnes recherchées',
    gradient: 'from-red-500 to-rose-700',
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
    label: 'Départs/Arrivées en gare',
    gradient: 'from-sky-400 to-blue-600',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  {
    id: 'about',
    icon: Info,
    label: "À propos de l'app",
    gradient: 'from-primary/80 to-primary',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  {
    id: 'assistance',
    icon: LifeBuoy,
    label: 'Assistance',
    gradient: 'from-orange-400 to-red-500',
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
            <Badge variant="secondary">v{__APP_VERSION__}</Badge>
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
          <li>Export HTML interactif (recherche, filtres, colonnes masquables)</li>
          <li>Export PDF tableau étendu multi-colonnes</li>
          <li>Historique adaptatif (train → contrôles, gare → embarquement)</li>
          <li>Rapport de synthèse avec cartes KPI (TC, PV, Bord, Total)</li>
          <li>Mode sombre / thèmes personnalisables</li>
          <li>Navigation personnalisable (sidebar + barre du bas)</li>
          <li>Trains du jour partagés par code privé ou QR code (équipe)</li>
          <li>Personnes recherchées (fiches photo, gérées par le manager)</li>
          <li>Compteur voyageurs grand écran (maintien appui)</li>
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

function ContentWantedPersons() {
  const { persons, isLoading } = useWantedPersons(true);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (persons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-3 text-muted-foreground">
        <AlertTriangle className="h-10 w-10 opacity-30" />
        <p className="text-sm">Aucune personne recherchée en ce moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2 flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
        Informations confidentielles — Usage professionnel uniquement.
      </p>
      {persons.map((p) => (
        <div key={p.id} className="flex gap-3 p-3 bg-muted/30 border border-border rounded-lg">
          {p.photo_url ? (
            <img
              src={p.photo_url}
              alt={`${p.prenom} ${p.nom}`}
              className="w-16 h-20 object-cover rounded-md border shrink-0"
            />
          ) : (
            <div className="w-16 h-20 bg-muted rounded-md border flex items-center justify-center shrink-0">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base text-foreground">{p.prenom} {p.nom}</p>
            {p.date_naissance && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Né(e) le {new Date(p.date_naissance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            )}
            {p.notes && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3 italic">{p.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContentContacts() {
  const { settings } = useAdminSettings();
  const supportContact = settings?.find(s => s.key === 'support_contact')?.value as { email?: string; phone?: string } | undefined;
  const supportEmail = supportContact?.email || 'controle-app@sncf.fr';
  const supportPhone = supportContact?.phone;

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
            <a href={`mailto:${supportEmail}`} className="text-sm text-primary hover:underline">
              {supportEmail}
            </a>
            {supportPhone && (
              <a href={`tel:${supportPhone.replace(/\s/g, '')}`} className="text-xs text-primary hover:underline block mt-0.5">
                {supportPhone}
              </a>
            )}
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

      {/* Actions — présentation générale */}
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

      {/* Présentation de l'application */}
      <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
        <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 rounded-lg shrink-0">
          <Monitor className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Présentation de l'application</p>
          <p className="text-xs text-muted-foreground">Présentation en images de l'application</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => window.open('/Présentation_de_l_application.html', '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          Ouvrir
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2"
          asChild
        >
          <a href="/Présentation_de_l_application.html" download="Présentation_de_l_application.html">
            <Download className="h-4 w-4" />
            Télécharger
          </a>
        </Button>
      </div>
    </div>
  );
}

function ContentAssistance() {
  const { user } = useAuth();
  const [view,    setView]    = useState<'form' | 'tickets'>('form');
  const [type,    setType]    = useState<'bug' | 'message'>('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [files,   setFiles]   = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sent,      setSent]      = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Vue "Mes tickets"
  const [myTickets,       setMyTickets]       = useState<any[]>([]);
  const [ticketsLoading,  setTicketsLoading]  = useState(false);
  const [expandedTicket,  setExpandedTicket]  = useState<string | null>(null);
  const [ticketReplies,   setTicketReplies]   = useState<Record<string, any[]>>({});
  const [userReply,       setUserReply]       = useState('');
  const [isSendingReply,  setIsSendingReply]  = useState(false);

  const loadTickets = async () => {
    if (!user) return;
    setTicketsLoading(true);
    const { data } = await supabase
      .from('support_tickets' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMyTickets(data || []);
    setTicketsLoading(false);
  };

  useEffect(() => {
    if (view === 'tickets') loadTickets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const expandTicket = async (ticketId: string) => {
    if (expandedTicket === ticketId) { setExpandedTicket(null); return; }
    setExpandedTicket(ticketId);
    const { data } = await supabase
      .from('support_replies' as any)
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at');
    setTicketReplies(prev => ({ ...prev, [ticketId]: data || [] }));
    // Marquer comme lu
    await supabase.rpc('mark_ticket_read' as any, { p_ticket_id: ticketId });
    setMyTickets(prev => prev.map(t => t.id === ticketId ? { ...t, has_unread_reply: false } : t));
  };

  const sendUserReply = async (ticketId: string) => {
    if (!user || !userReply.trim()) return;
    setIsSendingReply(true);
    await supabase.from('support_replies' as any).insert({
      ticket_id: ticketId,
      author_id: user.id,
      message: userReply.trim(),
      is_admin: false,
    });
    const { data } = await supabase
      .from('support_replies' as any)
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at');
    setTicketReplies(prev => ({ ...prev, [ticketId]: data || [] }));
    setUserReply('');
    setIsSendingReply(false);
  };

  const handleSend = async () => {
    if (!user || !subject.trim() || !message.trim()) return;
    setIsSending(true);
    try {
      const paths: string[] = [];
      for (const file of files) {
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('support-attachments').upload(path, file);
        if (!upErr) paths.push(path);
      }
      const { error } = await supabase
        .from('support_tickets' as any)
        .insert({ user_id: user.id, type, subject: subject.trim(), message: message.trim(), attachment_paths: paths });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      toast.error('Erreur lors de l\'envoi : ' + (e.message ?? 'Erreur inconnue'));
    } finally {
      setIsSending(false);
    }
  };

  /* ── Toggle vues ── */
  const viewToggle = (
    <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
      {(['form', 'tickets'] as const).map(v => (
        <button
          key={v}
          type="button"
          onClick={() => setView(v)}
          className={`flex-1 text-sm py-1.5 rounded-md transition-colors font-medium ${
            view === v ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {v === 'form' ? 'Nouveau message' : 'Mes tickets'}
        </button>
      ))}
    </div>
  );

  /* ── Vue "Mes tickets" ── */
  if (view === 'tickets') {
    return (
      <div className="space-y-4">
        {viewToggle}
        {ticketsLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!ticketsLoading && myTickets.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun ticket pour le moment</p>
        )}
        <div className="space-y-2">
          {myTickets.map(ticket => (
            <div key={ticket.id} className="border rounded-xl overflow-hidden">
              {/* En-tête du ticket */}
              <button
                type="button"
                className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                onClick={() => expandTicket(ticket.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={ticket.type === 'bug' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                      {ticket.type === 'bug' ? '🐛 Bug' : '💬 Message'}
                    </Badge>
                    {ticket.has_unread_reply && (
                      <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                    )}
                    {ticket.status === 'closed' && (
                      <Badge variant="outline" className="text-xs shrink-0">Fermé</Badge>
                    )}
                    <span className="text-sm font-medium truncate">{ticket.subject}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(ticket.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}
                  </p>
                </div>
                <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform ${expandedTicket === ticket.id ? 'rotate-90' : ''}`} />
              </button>

              {/* Détail expandé */}
              {expandedTicket === ticket.id && (
                <div className="border-t px-3 pb-3 space-y-3 bg-muted/10">
                  {/* Message original */}
                  <div className="mt-3 p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap leading-relaxed mr-6">
                    {ticket.message}
                  </div>

                  {/* Fil de réponses */}
                  {(ticketReplies[ticket.id] ?? []).map((r: any) => (
                    <div key={r.id} className={`p-3 rounded-lg text-sm ${r.is_admin ? 'bg-primary/10 ml-6' : 'bg-muted/30 mr-6'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs">{r.is_admin ? 'Admin' : 'Vous'}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{r.message}</p>
                    </div>
                  ))}

                  {/* Répondre (ticket ouvert) */}
                  {ticket.status === 'open' && (
                    <div className="flex gap-2">
                      <Textarea
                        value={userReply}
                        onChange={e => setUserReply(e.target.value)}
                        placeholder="Votre réponse…"
                        rows={2}
                        className="resize-none flex-1"
                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendUserReply(ticket.id); }}
                      />
                      <Button
                        size="icon"
                        className="self-end shrink-0"
                        onClick={() => sendUserReply(ticket.id)}
                        disabled={isSendingReply || !userReply.trim()}
                      >
                        {isSendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Vue "Nouveau message" (succès) ── */
  if (sent) {
    return (
      <div className="space-y-4">
        {viewToggle}
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-base">Message envoyé !</p>
            <p className="text-sm text-muted-foreground mt-1">L'administrateur traitera votre demande.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setSent(false); setSubject(''); setMessage(''); setFiles([]); }}>
              Nouveau message
            </Button>
            <Button size="sm" onClick={() => { setSent(false); setView('tickets'); }}>
              Voir mes tickets
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Vue "Nouveau message" (formulaire) ── */
  return (
    <div className="space-y-4">
      {viewToggle}

      {/* Type */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {(['bug', 'message'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 text-sm py-1.5 rounded-md transition-colors font-medium ${
              type === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'bug' ? '🐛 Signaler un bug' : '💬 Message'}
          </button>
        ))}
      </div>

      {/* Sujet */}
      <div className="space-y-1.5">
        <Label>Sujet</Label>
        <Input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder={type === 'bug' ? 'Décrivez le problème en bref…' : 'Sujet de votre message…'}
        />
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <Label>Message</Label>
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={type === 'bug'
            ? 'Décrivez ce qui s\'est passé, comment reproduire le bug…'
            : 'Votre message…'}
          rows={5}
          className="resize-none"
        />
      </div>

      {/* Pièces jointes */}
      <div className="space-y-2">
        <Label>Pièces jointes <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.txt"
          className="hidden"
          onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])])}
        />
        <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={() => fileRef.current?.click()}>
          <Paperclip className="h-4 w-4" />
          Ajouter des fichiers
        </Button>
        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-muted/30 px-3 py-1.5 rounded-md">
                <span className="truncate">{f.name}</span>
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="ml-2 text-muted-foreground hover:text-destructive shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Envoyer */}
      <Button
        className="w-full gap-2"
        onClick={handleSend}
        disabled={isSending || !subject.trim() || !message.trim()}
      >
        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Envoyer
      </Button>
    </div>
  );
}

const DIALOG_CONTENT: Record<string, { title: string; Content: () => JSX.Element }> = {
  fraude:    { title: 'Calcul du taux de fraude',   Content: ContentFraude },
  wanted:    { title: 'Personnes recherchées',        Content: ContentWantedPersons },
  contacts:  { title: 'Contacts utiles',             Content: ContentContacts },
  partager:      { title: "Partager l'application",     Content: ContentPartager },
  presentation:  { title: 'Présentation de l\'application', Content: ContentPresentation },
  departures:    { title: 'Départs/Arrivées en gare',       Content: DeparturesWidget },
  about:         { title: "À propos de l'application",      Content: ContentAbout },
  assistance:    { title: 'Assistance',                      Content: ContentAssistance },
};

/* ─── Page principale ────────────────────────────────────────────────────── */
export default function InfosUtilesPage() {
  const { user, loading: authLoading } = useAuth();
  const { settings, isLoading: settingsLoading } = useAdminSettings();
  const [searchParams] = useSearchParams();
  const [openTile, setOpenTile] = useState<string | null>(() => {
    const tile = searchParams.get('tile');
    return tile && DIALOG_CONTENT[tile] ? tile : null;
  });
  const [unreadRepliesCount, setUnreadRepliesCount] = useState(0);

  const hideInfosPage = settings?.find(s => s.key === 'hide_infos_page')?.value === true;

  // Compter les réponses non lues + s'abonner aux nouvelles réponses admin
  useEffect(() => {
    if (!user) return;
    supabase
      .from('support_tickets' as any)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('has_unread_reply', true)
      .then(({ count }) => setUnreadRepliesCount(count || 0));

    const ch = supabase
      .channel('user-support-replies')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_replies' },
        async (payload) => {
          const r = payload.new as any;
          if (!r.is_admin) return;
          const { data: t } = await supabase
            .from('support_tickets' as any)
            .select('user_id')
            .eq('id', r.ticket_id)
            .single();
          if ((t as any)?.user_id !== user.id) return;
          toast.info("L'admin a répondu à votre demande");
          setUnreadRepliesCount(c => c + 1);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
              <div key={tile.id} className="relative">
                {tile.id === 'assistance' && unreadRepliesCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 z-10 flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {unreadRepliesCount > 9 ? '9+' : unreadRepliesCount}
                  </span>
                )}
                <Card
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
              </div>
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
