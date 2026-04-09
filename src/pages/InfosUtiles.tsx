import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  X,
  GripVertical,
  Link,
  Star,
  Globe,
  Bell,
  Zap,
  PenLine,
  Check,
  Layers,
  ChevronLeft,
  Pin,
  Columns2,
  SeparatorHorizontal,
  Tag,
  NavigationArrow,
  SunDim,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { DeparturesWidget } from '@/components/controls/DeparturesWidget';
import { useWantedPersons, type WantedPerson } from '@/hooks/useWantedPersons';
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

/* ─── Config tuiles ─────────────────────────────────────────────────────── */
interface TilesConfig {
  order: string[];
  disabled: string[];
  labels: Record<string, string>;
  customTiles: CustomTileConfig[];
}

interface ContentBlock {
  type: 'text' | 'image';
  value: string;
}

interface SubTileConfig {
  id: string;
  label: string;
  icon: string;
  gradient: string;
  url?: string;
  content?: string;
}

interface CustomTileConfig {
  id: string;
  label: string;
  icon: string;
  gradient: string;
  url?: string;
  internalPath?: string;  // lien interne app
  content?: string;       // legacy
  blocks?: ContentBlock[];
  subTiles?: SubTileConfig[];
  wide?: boolean;         // double largeur
  isSeparator?: boolean;  // titre de section
  badgeText?: string;     // badge personnalisé
  pinned?: boolean;       // toujours en premier
  darkText?: boolean;     // texte sombre sur fond clair
}

interface RenderedTile {
  id: string;
  label: string;
  Icon: React.ElementType;
  gradient: string;
  isCustom: boolean;
  url?: string;
  internalPath?: string;
  content?: string;
  hasSubTiles?: boolean;
  wide?: boolean;
  isSeparator?: boolean;
  badgeText?: string;
  pinned?: boolean;
  darkText?: boolean;
}

const INTERNAL_PATHS = [
  { label: 'Accueil', path: '/' },
  { label: 'À bord', path: '/control' },
  { label: 'En gare', path: '/station' },
  { label: 'Statistiques', path: '/stats' },
  { label: 'Historique', path: '/history' },
  { label: 'Paramètres', path: '/settings' },
  { label: 'Infos utiles', path: '/infos' },
];

const ICON_MAP: Record<string, React.ElementType> = {
  Calculator, AlertTriangle, Phone, Share2, Monitor, Train, Info, LifeBuoy,
  ExternalLink, BookOpen, HelpCircle, Building2, BarChart3, History, Settings,
  MessageSquare, FileText, Mail, Link, Star, Globe, Bell, Zap, Download, QrCode,
  Shield, Users, Copy, Check, Layers,
};

const ICON_OPTIONS = [
  'ExternalLink', 'Link', 'FileText', 'BookOpen', 'Star', 'Globe', 'Bell', 'Zap',
  'Phone', 'Mail', 'Shield', 'Users', 'Building2', 'Settings', 'Download', 'QrCode',
  'BarChart3', 'MessageSquare', 'Train', 'Monitor', 'Calculator', 'AlertTriangle',
];

const GRADIENT_PRESETS = [
  { label: 'Bleu',    value: 'from-blue-400 to-indigo-500' },
  { label: 'Rouge',   value: 'from-red-500 to-rose-700' },
  { label: 'Vert',    value: 'from-green-400 to-emerald-500' },
  { label: 'Cyan',    value: 'from-teal-400 to-cyan-500' },
  { label: 'Rose',    value: 'from-rose-400 to-pink-600' },
  { label: 'Ciel',    value: 'from-sky-400 to-blue-600' },
  { label: 'Orange',  value: 'from-orange-400 to-red-500' },
  { label: 'Violet',  value: 'from-violet-400 to-purple-600' },
  { label: 'Ambre',   value: 'from-amber-400 to-orange-500' },
  { label: 'Gris',    value: 'from-slate-400 to-slate-600' },
];

const DEFAULT_TILES_ORDER = ['fraude', 'wanted', 'contacts', 'partager', 'presentation', 'departures', 'about', 'assistance'];

const slugify = (str: string) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

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

/* ─── SortableTileItem ───────────────────────────────────────────────────── */
function SortableTileItem({
  tile, editMode, isDisabled, onEdit, onToggle, onDelete, onDuplicate, onClick, badge,
}: {
  tile: RenderedTile;
  editMode: boolean;
  isDisabled: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onClick: () => void;
  badge?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tile.id, disabled: !editMode });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const textColor   = tile.darkText ? 'text-gray-800' : 'text-white';
  const iconBgColor = tile.darkText ? 'bg-gray-900/10' : 'bg-white/20';
  const colSpan     = tile.wide ? 'col-span-2' : tile.isSeparator ? 'col-span-2 sm:col-span-3' : '';

  // Séparateur : rendu spécial
  if (tile.isSeparator) {
    return (
      <div ref={setNodeRef} style={style} className={cn('relative flex items-center gap-3 px-1 py-2', colSpan, isDragging && 'opacity-50')}>
        {editMode && (
          <button {...attributes} {...listeners} className="p-1 bg-muted rounded text-muted-foreground cursor-grab touch-none shrink-0">
            <GripVertical className="h-3 w-3" />
          </button>
        )}
        <div className="h-px bg-border flex-1" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{tile.label}</span>
        <div className="h-px bg-border flex-1" />
        {editMode && (
          <div className="flex gap-0.5 shrink-0">
            <button onClick={onEdit} className="p-1 bg-muted rounded text-muted-foreground hover:bg-muted/80"><Pencil className="h-3 w-3" /></button>
            <button onClick={onToggle} className="p-1 bg-muted rounded text-muted-foreground hover:bg-muted/80" title={isDisabled ? 'Réactiver' : 'Masquer'}>{isDisabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}</button>
            <button onClick={onDelete} className="p-1 bg-red-100 rounded text-red-500 hover:bg-red-200"><Trash2 className="h-3 w-3" /></button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={cn('relative', colSpan, isDragging && 'opacity-50 z-50')}>
      {/* Badge notification (assistance) */}
      {!editMode && badge && badge > 0 ? (
        <span className="absolute top-1.5 right-1.5 z-10 flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}

      {/* Badge personnalisé */}
      {!editMode && tile.badgeText && (
        <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-900 text-[9px] font-bold uppercase tracking-wide leading-none">
          {tile.badgeText}
        </span>
      )}

      {/* Indicateur épinglé */}
      {tile.pinned && !editMode && (
        <span className="absolute top-1.5 right-1.5 z-10 p-0.5 rounded-full bg-white/30">
          <Pin className="h-2.5 w-2.5 text-white fill-white" />
        </span>
      )}

      {/* Overlay éditeur */}
      {editMode && (
        <div className="absolute inset-0 z-10 rounded-xl ring-2 ring-white/40 ring-inset pointer-events-none" />
      )}

      {/* Contrôles edit mode */}
      {editMode && (
        <>
          <button {...attributes} {...listeners} className="absolute top-1 left-1 z-20 p-1 bg-black/50 rounded text-white cursor-grab active:cursor-grabbing touch-none">
            <GripVertical className="h-3 w-3" />
          </button>
          <div className="absolute top-1 right-1 z-20 flex gap-0.5">
            <button onClick={onEdit} className="p-1 bg-black/50 rounded text-white hover:bg-black/70"><Pencil className="h-3 w-3" /></button>
            <button onClick={onToggle} className="p-1 bg-black/50 rounded text-white hover:bg-black/70" title={isDisabled ? 'Réactiver' : 'Désactiver'}>{isDisabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}</button>
            {tile.isCustom && onDuplicate && (
              <button onClick={onDuplicate} className="p-1 bg-blue-500/80 rounded text-white hover:bg-blue-600" title="Dupliquer"><Copy className="h-3 w-3" /></button>
            )}
            {tile.isCustom && (
              <button onClick={onDelete} className="p-1 bg-red-500/80 rounded text-white hover:bg-red-600"><Trash2 className="h-3 w-3" /></button>
            )}
          </div>
          {/* Indicateurs visuels en edit */}
          <div className="absolute bottom-1 left-1 z-20 flex gap-0.5">
            {tile.pinned    && <span className="p-0.5 bg-black/50 rounded"><Pin className="h-2.5 w-2.5 text-white" /></span>}
            {tile.wide      && <span className="p-0.5 bg-black/50 rounded"><Columns2 className="h-2.5 w-2.5 text-white" /></span>}
            {tile.darkText  && <span className="p-0.5 bg-black/50 rounded"><SunDim className="h-2.5 w-2.5 text-white" /></span>}
            {tile.badgeText && <span className="px-1 bg-amber-400 rounded text-amber-900 text-[8px] font-bold">{tile.badgeText}</span>}
          </div>
        </>
      )}

      <Card
        onClick={editMode ? undefined : onClick}
        className={cn(
          'border-0 shadow-sm overflow-hidden transition-all select-none',
          !editMode && 'cursor-pointer hover:shadow-md active:scale-95 transition-transform',
          isDisabled && editMode && 'opacity-50',
        )}
      >
        <div className={`bg-gradient-to-br ${tile.gradient} p-5 flex flex-col items-center gap-3 ${textColor} relative`}>
          <div className={`p-3 rounded-2xl ${iconBgColor}`}>
            <tile.Icon className={`h-6 w-6 ${textColor}`} />
          </div>
          <span className="text-sm font-semibold text-center leading-tight">{tile.label}</span>
          {!editMode && tile.hasSubTiles && (
            <span className={`absolute bottom-1.5 right-2 ${tile.darkText ? 'text-gray-600' : 'text-white/70'} text-[10px]`}>
              <Layers className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}

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
          <li>En gare : navigation sections, autocomplete gare, brouillon auto-sauvegardé</li>
          <li>Embarquement : Info SNCF + schéma + autocomplete par train (heure, origine, destination)</li>
          <li>Schéma train : heure d'arrivée et de départ par gare dans l'itinéraire</li>
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

function WantedPersonsPanel({ canEdit }: { canEdit: boolean }) {
  const { persons, isLoading, addPerson, updatePerson, deletePerson, toggleActive } = useWantedPersons(!canEdit);

  const [formOpen, setFormOpen]             = useState(false);
  const [editingPerson, setEditingPerson]   = useState<WantedPerson | null>(null);
  const [form, setForm]                     = useState({ nom: '', prenom: '', date_naissance: '', notes: '' });
  const [photoFile, setPhotoFile]           = useState<File | null>(null);
  const [photoPreview, setPhotoPreview]     = useState<string | null>(null);
  const [saving, setSaving]                 = useState(false);
  const photoRef                            = useRef<HTMLInputElement>(null);

  const openAdd = () => {
    setEditingPerson(null);
    setForm({ nom: '', prenom: '', date_naissance: '', notes: '' });
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormOpen(true);
  };

  const openEdit = (p: WantedPerson) => {
    setEditingPerson(p);
    setForm({ nom: p.nom, prenom: p.prenom, date_naissance: p.date_naissance || '', notes: p.notes || '' });
    setPhotoFile(null);
    setPhotoPreview(p.photo_url);
    setFormOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.nom.trim() || !form.prenom.trim()) return;
    setSaving(true);
    let ok: boolean;
    if (editingPerson) {
      ok = await updatePerson(editingPerson.id, {
        nom: form.nom.trim(), prenom: form.prenom.trim(),
        date_naissance: form.date_naissance || null,
        notes: form.notes || null,
        ...(photoFile ? { photoFile } : {}),
      });
    } else {
      ok = await addPerson({
        nom: form.nom.trim(), prenom: form.prenom.trim(),
        date_naissance: form.date_naissance || null,
        photo_url: null, notes: form.notes || null,
        ...(photoFile ? { photoFile } : {}),
      });
    }
    setSaving(false);
    if (ok) {
      setFormOpen(false);
      toast.success(editingPerson ? 'Fiche mise à jour' : 'Personne ajoutée');
    } else {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (p: WantedPerson) => {
    if (!confirm(`Supprimer la fiche de ${p.prenom} ${p.nom} ?`)) return;
    const ok = await deletePerson(p.id);
    if (ok) toast.success('Fiche supprimée');
    else toast.error('Erreur lors de la suppression');
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Avertissement */}
      <p className="text-xs text-muted-foreground bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2 flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
        Informations confidentielles — Usage professionnel uniquement.
      </p>

      {/* Bouton ajout (managers/admins) */}
      {canEdit && (
        <Button size="sm" className="self-start" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" />
          Ajouter une personne
        </Button>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : persons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-3 text-muted-foreground">
          <AlertTriangle className="h-10 w-10 opacity-30" />
          <p className="text-sm">Aucune personne recherchée en ce moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {persons.map((p) => (
            <div key={p.id} className={`flex gap-3 p-3 border rounded-lg ${p.active ? 'bg-muted/30 border-border' : 'bg-muted/10 border-border/40 opacity-60'}`}>
              {p.photo_url ? (
                <img src={p.photo_url} alt={`${p.prenom} ${p.nom}`} className="w-16 h-20 object-cover rounded-md border shrink-0" />
              ) : (
                <div className="w-16 h-20 bg-muted rounded-md border flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-base text-foreground">{p.prenom} {p.nom}</p>
                    {!p.active && <Badge variant="outline" className="text-[10px] mt-0.5">Inactif</Badge>}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)} title="Modifier">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleActive(p.id, !p.active)} title={p.active ? 'Désactiver' : 'Réactiver'}>
                        {p.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(p)} title="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {p.date_naissance && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Né(e) le {new Date(p.date_naissance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                )}
                {p.notes && <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-3">{p.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog ajout / édition */}
      {canEdit && (
        <Dialog open={formOpen} onOpenChange={(open) => { if (!open) setFormOpen(false); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPerson ? 'Modifier la fiche' : 'Nouvelle personne recherchée'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Photo */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-20 bg-muted rounded-md border overflow-hidden flex items-center justify-center shrink-0">
                  {photoPreview
                    ? <img src={photoPreview} className="w-full h-full object-cover" alt="" />
                    : <Users className="h-6 w-6 text-muted-foreground" />}
                </div>
                <div>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  <Button size="sm" variant="outline" onClick={() => photoRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {photoPreview ? 'Changer la photo' : 'Ajouter une photo'}
                  </Button>
                  {photoPreview && (
                    <Button size="sm" variant="ghost" className="mt-1 text-destructive hover:text-destructive" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>
                      <X className="h-3.5 w-3.5 mr-1" />Retirer
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Prénom *</Label>
                  <Input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Prénom" />
                </div>
                <div className="space-y-1.5">
                  <Label>Nom *</Label>
                  <Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Nom" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Date de naissance</Label>
                <Input type="date" value={form.date_naissance} onChange={e => setForm(f => ({ ...f, date_naissance: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes / Signalement</Label>
                <Textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ex : Fraude récurrente ligne Metz-Thionville…" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving || !form.nom.trim() || !form.prenom.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                {editingPerson ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
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
  const origin = window.location.origin;
  const [emailInteractive, setEmailInteractive] = useState(true);
  const [emailApplication, setEmailApplication] = useState(false);
  const [emailFormat, setEmailFormat] = useState<'pdf' | 'html'>('pdf');

  const handleSendEmail = () => {
    const subject = encodeURIComponent('SNCF Contrôles — Présentation');
    const lines: string[] = ['Bonjour,\n'];

    if (emailInteractive) {
      const url = emailFormat === 'pdf'
        ? `${origin}/presentation_sncf_controles.pdf`
        : `${origin}/presentation_sncf_controles.html`;
      lines.push(`Présentation interactive (${emailFormat.toUpperCase()}) :\n${url}`);
    }
    if (emailApplication) {
      const url = emailFormat === 'pdf'
        ? `${origin}/Présentation_de_l_application.pdf`
        : `${origin}/Présentation_de_l_application.html`;
      lines.push(`Présentation de l'application (${emailFormat.toUpperCase()}) :\n${url}`);
    }
    lines.push('\nCordialement');
    window.open(`mailto:?subject=${subject}&body=${encodeURIComponent(lines.join('\n\n'))}`);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Présentation complète de l'application SNCF Contrôles : fonctionnalités, architecture,
        guide d'utilisation. À partager avec votre équipe ou votre hiérarchie.
      </p>

      {/* Présentation interactive */}
      <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800">
        <div className="p-2.5 bg-rose-100 dark:bg-rose-900/40 rounded-lg shrink-0">
          <Monitor className="h-6 w-6 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">Présentation interactive</p>
          <p className="text-xs text-muted-foreground">Document HTML — slides animées</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <Button className="w-full gap-2" onClick={() => window.open(`${origin}/presentation_sncf_controles.html`, '_blank')}>
          <ExternalLink className="h-4 w-4" />
          Ouvrir la présentation
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="w-full gap-2" asChild>
            <a href="/presentation_sncf_controles.pdf" download="presentation_sncf_controles.pdf">
              <FileText className="h-4 w-4" />
              PDF
            </a>
          </Button>
          <Button variant="outline" className="w-full gap-2" asChild>
            <a href="/presentation_sncf_controles.html" download="presentation_sncf_controles.html">
              <Download className="h-4 w-4" />
              HTML
            </a>
          </Button>
        </div>
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
      <div className="grid grid-cols-1 gap-2">
        <Button variant="outline" className="w-full gap-2" onClick={() => window.open('/Présentation_de_l_application.html', '_blank')}>
          <ExternalLink className="h-4 w-4" />
          Ouvrir
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="w-full gap-2" asChild>
            <a href="/Présentation_de_l_application.pdf" download="Présentation_de_l_application.pdf">
              <FileText className="h-4 w-4" />
              PDF
            </a>
          </Button>
          <Button variant="outline" className="w-full gap-2" asChild>
            <a href="/Présentation_de_l_application.html" download="Présentation_de_l_application.html">
              <Download className="h-4 w-4" />
              HTML
            </a>
          </Button>
        </div>
      </div>

      {/* Section email */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Envoyer par email</p>
        </div>

        {/* Sélection des fichiers */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Fichiers</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={emailInteractive} onCheckedChange={v => setEmailInteractive(!!v)} />
            <span className="text-sm">Présentation interactive</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={emailApplication} onCheckedChange={v => setEmailApplication(!!v)} />
            <span className="text-sm">Présentation de l'application</span>
          </label>
        </div>

        {/* Sélection du format */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Format</p>
          <div className="flex gap-2">
            <button
              onClick={() => setEmailFormat('pdf')}
              className={`flex-1 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
                emailFormat === 'pdf'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-transparent text-muted-foreground border-border hover:border-blue-400'
              }`}
            >
              PDF
            </button>
            <button
              onClick={() => setEmailFormat('html')}
              className={`flex-1 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
                emailFormat === 'html'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-transparent text-muted-foreground border-border hover:border-blue-400'
              }`}
            >
              HTML
            </button>
          </div>
        </div>

        <Button
          className="w-full gap-2"
          disabled={!emailInteractive && !emailApplication}
          onClick={handleSendEmail}
        >
          <Mail className="h-4 w-4" />
          Envoyer par email
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
  fraude:        { title: 'Calcul du taux de fraude',          Content: ContentFraude },
  contacts:      { title: 'Contacts utiles',                   Content: ContentContacts },
  partager:      { title: "Partager l'application",            Content: ContentPartager },
  presentation:  { title: "Présentation de l'application",     Content: ContentPresentation },
  departures:    { title: 'Départs/Arrivées en gare',          Content: () => <DeparturesWidget showTrainSearch /> },
  about:         { title: "À propos de l'application",         Content: ContentAbout },
  assistance:    { title: 'Assistance',                        Content: ContentAssistance },
};

/* ─── Page principale ────────────────────────────────────────────────────── */
export default function InfosUtilesPage() {
  const { user, loading: authLoading, isAdmin, isManager } = useAuth();
  const { settings, isLoading: settingsLoading } = useAdminSettings();
  const queryClient = useQueryClient();
  const canEditWanted = isAdmin() || isManager();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [openTile, setOpenTile] = useState<string | null>(() => {
    const tile = searchParams.get('tile');
    return tile && (DIALOG_CONTENT[tile] || tile === 'wanted') ? tile : null;
  });
  const [unreadRepliesCount, setUnreadRepliesCount] = useState(0);

  // ── Edit mode (admin only) ─────────────────────────────────────────────
  const [editMode, setEditMode]             = useState(false);
  const [localOrder, setLocalOrder]         = useState<string[]>([]);
  const [localDisabled, setLocalDisabled]   = useState<string[]>([]);
  const [localLabels, setLocalLabels]       = useState<Record<string, string>>({});
  const [localCustom, setLocalCustom]       = useState<CustomTileConfig[]>([]);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Dialog édition d'une tuile
  const [editTileId,    setEditTileId]    = useState<string | null>(null);
  const [editTileLabel, setEditTileLabel] = useState('');
  // Pour les custom tiles
  const [editTileIcon,     setEditTileIcon]     = useState('ExternalLink');
  const [editTileGradient, setEditTileGradient] = useState(GRADIENT_PRESETS[0].value);
  const [editTileUrl,          setEditTileUrl]          = useState('');
  const [editBlocks,           setEditBlocks]           = useState<ContentBlock[]>([]);
  const [isUploadingEditBlock, setIsUploadingEditBlock] = useState(false);
  const editBlockImageRef = useRef<HTMLInputElement>(null);

  // Dialog ajout tuile custom
  const [addTileOpen,         setAddTileOpen]         = useState(false);
  const [newTileLabel,        setNewTileLabel]        = useState('');
  const [newTileIcon,         setNewTileIcon]         = useState('ExternalLink');
  const [newTileGradient,     setNewTileGradient]     = useState(GRADIENT_PRESETS[0].value);
  const [newTileUrl,          setNewTileUrl]          = useState('');
  const [newBlocks,           setNewBlocks]           = useState<ContentBlock[]>([]);
  const [isUploadingNewBlock,  setIsUploadingNewBlock]  = useState(false);
  const [isDraggingOverEdit,   setIsDraggingOverEdit]   = useState(false);
  const [isDraggingOverNew,    setIsDraggingOverNew]    = useState(false);
  const newBlockImageRef = useRef<HTMLInputElement>(null);

  // Dialog affichage contenu tuile custom
  const [customContentTile, setCustomContentTile] = useState<CustomTileConfig | null>(null);

  // Sheet sous-tuiles (affichage)
  const [openSubTilesSheet, setOpenSubTilesSheet] = useState<CustomTileConfig | null>(null);
  const [openSubTileContent, setOpenSubTileContent] = useState<SubTileConfig | null>(null);

  // Édition sous-tuiles (dans le dialog d'édition de tuile)
  const [editSubTiles,  setEditSubTiles]  = useState<SubTileConfig[]>([]);
  const [addSubOpen,    setAddSubOpen]    = useState(false);
  const [newSubLabel,   setNewSubLabel]   = useState('');
  const [newSubIcon,    setNewSubIcon]    = useState('ExternalLink');
  const [newSubGradient,setNewSubGradient]= useState(GRADIENT_PRESETS[0].value);
  const [newSubUrl,     setNewSubUrl]     = useState('');
  const [newSubContent, setNewSubContent] = useState('');

  // Nouvelles propriétés tuile (edit)
  const [editTileWide,      setEditTileWide]      = useState(false);
  const [editTilePinned,    setEditTilePinned]    = useState(false);
  const [editTileDarkText,  setEditTileDarkText]  = useState(false);
  const [editTileBadge,     setEditTileBadge]     = useState('');
  const [editTileInternal,  setEditTileInternal]  = useState('');
  const [editTileSeparator, setEditTileSeparator] = useState(false);
  // Nouvelles propriétés tuile (add)
  const [newTileWide,      setNewTileWide]      = useState(false);
  const [newTilePinned,    setNewTilePinned]    = useState(false);
  const [newTileDarkText,  setNewTileDarkText]  = useState(false);
  const [newTileBadge,     setNewTileBadge]     = useState('');
  const [newTileInternal,  setNewTileInternal]  = useState('');
  const [newTileSeparator, setNewTileSeparator] = useState(false);

  // ── Config tuiles ──────────────────────────────────────────────────────
  const tilesConfigRaw = settings?.find(s => s.key === 'infos_tiles_config')?.value as TilesConfig | undefined;
  const tilesConfig: TilesConfig = {
    order:       tilesConfigRaw?.order       ?? DEFAULT_TILES_ORDER,
    disabled:    tilesConfigRaw?.disabled    ?? [],
    labels:      tilesConfigRaw?.labels      ?? {},
    customTiles: tilesConfigRaw?.customTiles ?? [],
  };

  // Toutes les tuiles (built-in + custom) sous forme RenderedTile
  const allRenderedTiles: RenderedTile[] = [
    ...TILES.map(t => ({
      id: t.id,
      label: tilesConfig.labels[t.id] ?? t.label,
      Icon: t.icon,
      gradient: t.gradient,
      isCustom: false,
    })),
    ...tilesConfig.customTiles.map(ct => ({
      id: ct.id,
      label: ct.label,
      Icon: ICON_MAP[ct.icon] ?? ExternalLink,
      gradient: ct.gradient,
      isCustom: true,
      url: ct.url,
      internalPath: ct.internalPath,
      content: ct.content,
      hasSubTiles: (ct.subTiles?.length ?? 0) > 0,
      wide: ct.wide,
      isSeparator: ct.isSeparator,
      badgeText: ct.badgeText,
      pinned: ct.pinned,
      darkText: ct.darkText,
    })),
  ];

  // Ordonner selon la config (les nouveaux non encore en ordre vont à la fin)
  const orderedIds = [
    ...tilesConfig.order,
    ...allRenderedTiles.map(t => t.id).filter(id => !tilesConfig.order.includes(id)),
  ];
  const orderedTiles = orderedIds
    .map(id => allRenderedTiles.find(t => t.id === id))
    .filter((t): t is RenderedTile => !!t);

  // Pour non-admins : filtrer les tuiles désactivées, épinglées en premier
  const applyPin = (tiles: RenderedTile[]) => [
    ...tiles.filter(t => t.pinned),
    ...tiles.filter(t => !t.pinned),
  ];
  const visibleTiles = applyPin(
    isAdmin() ? orderedTiles : orderedTiles.filter(t => !tilesConfig.disabled.includes(t.id))
  );

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const openEditMode = () => {
    setLocalOrder(orderedIds.filter(id => allRenderedTiles.some(t => t.id === id)));
    setLocalDisabled([...tilesConfig.disabled]);
    setLocalLabels({ ...tilesConfig.labels });
    setLocalCustom([...tilesConfig.customTiles]);
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setEditTileId(null);
  };

  const saveEditMode = useCallback(async () => {
    setIsSavingConfig(true);
    try {
      const config: TilesConfig = {
        order: localOrder,
        disabled: localDisabled,
        labels: localLabels,
        customTiles: localCustom,
      };
      const { error } = await supabase
        .from('admin_settings' as any)
        .update({ value: config })
        .eq('key', 'infos_tiles_config');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Configuration sauvegardée');
      setEditMode(false);
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSavingConfig(false);
    }
  }, [localOrder, localDisabled, localLabels, localCustom, queryClient]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalOrder(prev => {
        const oldIdx = prev.indexOf(active.id as string);
        const newIdx = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const uploadTileImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from('tile-images').upload(path, file);
    if (error) { toast.error('Erreur upload : ' + error.message); return null; }
    return supabase.storage.from('tile-images').getPublicUrl(data.path).data.publicUrl;
  };

  const openEditTile = (tile: RenderedTile) => {
    setEditTileId(tile.id);
    setEditTileLabel(localLabels[tile.id] ?? tile.label);
    // reset champs built-in
    setEditTileWide(false); setEditTilePinned(false); setEditTileDarkText(false);
    setEditTileBadge(''); setEditTileInternal(''); setEditTileSeparator(false);
    setEditBlocks([]); setEditSubTiles([]); setAddSubOpen(false);
    if (tile.isCustom) {
      const ct = localCustom.find(c => c.id === tile.id);
      setEditTileIcon(ct?.icon ?? 'ExternalLink');
      setEditTileGradient(ct?.gradient ?? GRADIENT_PRESETS[0].value);
      setEditTileUrl(ct?.url ?? '');
      setEditTileInternal(ct?.internalPath ?? '');
      if (ct?.blocks) setEditBlocks(ct.blocks);
      else if (ct?.content) setEditBlocks([{ type: 'text', value: ct.content }]);
      else setEditBlocks([]);
      setEditSubTiles(ct?.subTiles ?? []);
      setAddSubOpen(false);
      setEditTileWide(ct?.wide ?? false);
      setEditTilePinned(ct?.pinned ?? false);
      setEditTileDarkText(ct?.darkText ?? false);
      setEditTileBadge(ct?.badgeText ?? '');
      setEditTileSeparator(ct?.isSeparator ?? false);
    }
  };

  const saveTileEdit = () => {
    if (!editTileId) return;
    const isCustom = localCustom.some(c => c.id === editTileId);
    if (isCustom) {
      setLocalCustom(prev => prev.map(c => c.id === editTileId
        ? {
            ...c,
            label:        editTileLabel,
            icon:         editTileIcon,
            gradient:     editTileGradient,
            url:          editTileUrl || undefined,
            internalPath: editTileInternal || undefined,
            blocks:       editBlocks.length > 0 ? editBlocks : undefined,
            content:      undefined,
            subTiles:     editSubTiles.length > 0 ? editSubTiles : undefined,
            wide:         editTileWide || undefined,
            isSeparator:  editTileSeparator || undefined,
            badgeText:    editTileBadge.trim() || undefined,
            pinned:       editTilePinned || undefined,
            darkText:     editTileDarkText || undefined,
          }
        : c
      ));
    } else {
      const originalTile = TILES.find(t => t.id === editTileId);
      const newLabels = { ...localLabels };
      if (editTileLabel === originalTile?.label) delete newLabels[editTileId];
      else newLabels[editTileId] = editTileLabel;
      setLocalLabels(newLabels);
    }
    setEditTileId(null);
  };

  const toggleTileDisabled = (id: string) => {
    setLocalDisabled(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const deleteTile = (id: string) => {
    if (!confirm('Supprimer cette tuile ?')) return;
    setLocalCustom(prev => prev.filter(c => c.id !== id));
    setLocalOrder(prev => prev.filter(o => o !== id));
  };

  const duplicateTile = (id: string) => {
    const ct = localCustom.find(c => c.id === id);
    if (!ct) return;
    const base = `${ct.id}_copie`;
    let newId = base; let n = 2;
    while (localCustom.some(c => c.id === newId)) { newId = `${base}_${n++}`; }
    const clone: CustomTileConfig = { ...ct, id: newId, label: `${ct.label} (copie)` };
    setLocalCustom(prev => [...prev, clone]);
    setLocalOrder(prev => {
      const idx = prev.indexOf(id);
      const next = [...prev];
      next.splice(idx + 1, 0, newId);
      return next;
    });
    toast.success('Tuile dupliquée');
  };

  const addCustomTile = () => {
    if (!newTileLabel.trim()) return;
    const slug = slugify(newTileLabel.trim());
    const base = `custom_${slug || Date.now()}`;
    // Avoid ID collision by appending a suffix if needed
    const existingIds = localCustom.map(c => c.id);
    let newId = base;
    let suffix = 2;
    while (existingIds.includes(newId)) { newId = `${base}_${suffix++}`; }
    const newTile: CustomTileConfig = {
      id: newId,
      label: newTileLabel.trim(),
      icon: newTileIcon,
      gradient: newTileGradient,
      url: newTileUrl.trim() || undefined,
      internalPath: newTileInternal || undefined,
      blocks: newBlocks.length > 0 ? newBlocks : undefined,
      wide: newTileWide || undefined,
      isSeparator: newTileSeparator || undefined,
      badgeText: newTileBadge.trim() || undefined,
      pinned: newTilePinned || undefined,
      darkText: newTileDarkText || undefined,
    };
    setLocalCustom(prev => [...prev, newTile]);
    setLocalOrder(prev => [...prev, newId]);
    setNewTileLabel(''); setNewTileUrl(''); setNewBlocks([]);
    setNewTileIcon('ExternalLink'); setNewTileGradient(GRADIENT_PRESETS[0].value);
    setNewTileWide(false); setNewTilePinned(false); setNewTileDarkText(false);
    setNewTileBadge(''); setNewTileInternal(''); setNewTileSeparator(false);
    setAddTileOpen(false);
    toast.success('Tuile ajoutée — pensez à sauvegarder');
  };

  // Tuiles à afficher en mode édition (toutes, ordonnées selon localOrder)
  const editModeTiles: RenderedTile[] = [
    ...TILES.map(t => ({
      id: t.id,
      label: localLabels[t.id] ?? t.label,
      Icon: t.icon, gradient: t.gradient, isCustom: false,
    })),
    ...localCustom.map(ct => ({
      id: ct.id, label: ct.label,
      Icon: ICON_MAP[ct.icon] ?? ExternalLink,
      gradient: ct.gradient, isCustom: true, url: ct.url, internalPath: ct.internalPath,
      content: ct.content, hasSubTiles: (ct.subTiles?.length ?? 0) > 0,
      wide: ct.wide, isSeparator: ct.isSeparator, badgeText: ct.badgeText,
      pinned: ct.pinned, darkText: ct.darkText,
    })),
  ].sort((a, b) => {
    const ai = localOrder.indexOf(a.id);
    const bi = localOrder.indexOf(b.id);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

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

  const dialogDef = openTile && openTile !== 'wanted' ? DIALOG_CONTENT[openTile] : null;

  return (
    <AppLayout>
      <div className="space-y-5 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Infos utiles
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Guides, procédures et informations pour les contrôleurs
            </p>
          </div>
          {isAdmin() && !editMode && (
            <Button size="sm" variant="outline" onClick={openEditMode} className="shrink-0">
              <PenLine className="h-3.5 w-3.5 mr-1.5" />
              Modifier
            </Button>
          )}
          {isAdmin() && editMode && (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="ghost" onClick={cancelEditMode}>Annuler</Button>
              <Button size="sm" onClick={saveEditMode} disabled={isSavingConfig}>
                {isSavingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                Sauvegarder
              </Button>
            </div>
          )}
        </div>

        {/* Bandeau mode édition */}
        {editMode && (
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              Mode édition — Glissez pour réordonner, œil pour masquer aux agents, crayon pour renommer
            </p>
            <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 dark:border-amber-700" onClick={() => setAddTileOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />Ajouter
            </Button>
          </div>
        )}

        {/* Grille de tuiles */}
        {editMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localOrder} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {editModeTiles.map(tile => (
                  <SortableTileItem
                    key={tile.id}
                    tile={tile}
                    editMode
                    isDisabled={localDisabled.includes(tile.id)}
                    onEdit={() => openEditTile(tile)}
                    onToggle={() => toggleTileDisabled(tile.id)}
                    onDelete={tile.isCustom ? () => deleteTile(tile.id) : undefined}
                    onDuplicate={tile.isCustom ? () => duplicateTile(tile.id) : undefined}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {visibleTiles.map(tile => (
              <SortableTileItem
                key={tile.id}
                tile={tile}
                editMode={false}
                isDisabled={false}
                onEdit={() => {}}
                onToggle={() => {}}
                onClick={() => {
                  if (tile.isSeparator) return;
                  if (tile.internalPath) { navigate(tile.internalPath); return; }
                  if (tile.url) { window.open(tile.url, '_blank', 'noopener'); return; }
                  if (tile.isCustom) {
                    const ct = tilesConfig.customTiles.find(c => c.id === tile.id);
                    if (!ct) return;
                    if (ct.subTiles?.length) { setOpenSubTilesSheet(ct); return; }
                    if (ct.blocks?.length || ct.content) { setCustomContentTile(ct); return; }
                    return;
                  }
                  setOpenTile(tile.id);
                }}
                badge={tile.id === 'assistance' ? unreadRepliesCount : undefined}
              />
            ))}
          </div>
        )}

        {/* Dialog — Édition d'une tuile */}
        <Dialog open={!!editTileId} onOpenChange={(open) => !open && setEditTileId(null)}>
          <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier la tuile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Label affiché</Label>
                <Input value={editTileLabel} onChange={e => setEditTileLabel(e.target.value)} placeholder="Nom de la tuile" />
              </div>
              {/* Champs custom seulement */}
              {editTileId && localCustom.some(c => c.id === editTileId) && (
                <>
                  {/* ── Options rapides ── */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'sep', label: 'Séparateur', icon: SeparatorHorizontal, val: editTileSeparator, set: setEditTileSeparator },
                      { key: 'wide', label: 'Double largeur', icon: Columns2, val: editTileWide, set: setEditTileWide },
                      { key: 'pin', label: 'Épingler', icon: Pin, val: editTilePinned, set: setEditTilePinned },
                      { key: 'dark', label: 'Texte sombre', icon: SunDim, val: editTileDarkText, set: setEditTileDarkText },
                    ].map(({ key, label, icon: Ic, val, set }) => (
                      <button key={key} type="button"
                        onClick={() => set(!val)}
                        className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors', val ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
                        <Ic className="h-3.5 w-3.5 shrink-0" />{label}
                      </button>
                    ))}
                  </div>

                  {/* Badge texte */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Badge <span className="text-muted-foreground font-normal">(ex : Nouveau, Urgent)</span></Label>
                    <Input value={editTileBadge} onChange={e => setEditTileBadge(e.target.value)} placeholder="Texte du badge — laisser vide pour aucun" maxLength={12} />
                  </div>

                  {/* Lien interne */}
                  {!editTileSeparator && (
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5"><NavigationArrow className="h-3.5 w-3.5" />Lien interne <span className="text-muted-foreground font-normal">(page de l'app)</span></Label>
                      <select value={editTileInternal} onChange={e => setEditTileInternal(e.target.value)}
                        className="w-full text-sm rounded-md border border-input bg-background px-3 py-2">
                        <option value="">— Aucun lien interne —</option>
                        {INTERNAL_PATHS.map(p => <option key={p.path} value={p.path}>{p.label}</option>)}
                      </select>
                    </div>
                  )}

                  {/* URL externe */}
                  {!editTileSeparator && (
                  <div className="space-y-1.5">
                    <Label>URL <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                    <Input value={editTileUrl} onChange={e => setEditTileUrl(e.target.value)} placeholder="https://... — laisser vide si non applicable" type="url" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contenu <span className="text-muted-foreground font-normal">(optionnel — affiché si pas d'URL)</span></Label>
                    <div
                      className={cn('space-y-2 rounded-lg border-2 border-dashed p-1 transition-colors', isDraggingOverEdit ? 'border-primary bg-primary/5' : 'border-transparent')}
                      onDragOver={e => { e.preventDefault(); setIsDraggingOverEdit(true); }}
                      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingOverEdit(false); }}
                      onDrop={async (e) => {
                        e.preventDefault(); setIsDraggingOverEdit(false);
                        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                        if (!files.length) return;
                        setIsUploadingEditBlock(true);
                        for (const file of files) { const url = await uploadTileImage(file); if (url) setEditBlocks(prev => [...prev, { type: 'image', value: url }]); }
                        setIsUploadingEditBlock(false);
                      }}
                    >
                      {isDraggingOverEdit && editBlocks.length === 0 && (
                        <p className="text-center text-xs text-primary py-3">Déposer l'image ici</p>
                      )}
                      {editBlocks.map((block, i) => (
                        <div key={i} className="relative border rounded-lg p-2 pr-8 bg-muted/20">
                          {block.type === 'text' ? (
                            <Textarea
                              value={block.value}
                              onChange={e => setEditBlocks(prev => prev.map((b, j) => j === i ? { ...b, value: e.target.value } : b))}
                              placeholder="Votre texte…"
                              rows={3}
                              className="resize-none border-0 p-0 shadow-none focus-visible:ring-0 bg-transparent"
                            />
                          ) : (
                            <img src={block.value} alt="" className="max-h-40 rounded object-contain" />
                          )}
                          <button type="button" onClick={() => setEditBlocks(prev => prev.filter((_, j) => j !== i))} className="absolute top-1.5 right-1.5 p-1 text-muted-foreground hover:text-destructive">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" type="button" onClick={() => setEditBlocks(prev => [...prev, { type: 'text', value: '' }])}>
                        <FileText className="h-3.5 w-3.5 mr-1.5" />Texte
                      </Button>
                      <Button size="sm" variant="outline" type="button" disabled={isUploadingEditBlock} onClick={() => editBlockImageRef.current?.click()}>
                        {isUploadingEditBlock ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                        Image
                      </Button>
                      <input ref={editBlockImageRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        setIsUploadingEditBlock(true);
                        const url = await uploadTileImage(file);
                        if (url) setEditBlocks(prev => [...prev, { type: 'image', value: url }]);
                        setIsUploadingEditBlock(false); e.target.value = '';
                      }} />
                    </div>
                  </div>
                  )} {/* fin !editTileSeparator */}

                  {!editTileSeparator && (
                  <div className="space-y-1.5">
                    <Label>Icône</Label>
                    <div className="grid grid-cols-6 gap-1.5">
                      {ICON_OPTIONS.map(iconKey => {
                        const Ic = ICON_MAP[iconKey];
                        return (
                          <button
                            key={iconKey}
                            onClick={() => setEditTileIcon(iconKey)}
                            className={cn('p-2 rounded-lg border flex items-center justify-center transition-colors', editTileIcon === iconKey ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}
                            title={iconKey}
                          >
                            {Ic && <Ic className="h-4 w-4" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Couleur</Label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {GRADIENT_PRESETS.map(g => (
                        <button
                          key={g.value}
                          onClick={() => setEditTileGradient(g.value)}
                          className={cn(`h-8 rounded-lg bg-gradient-to-br ${g.value} transition-all`, editTileGradient === g.value ? 'ring-2 ring-offset-2 ring-foreground' : 'opacity-70 hover:opacity-100')}
                          title={g.label}
                        />
                      ))}
                    </div>
                  </div>
                  )} {/* fin !editTileSeparator icône+couleur */}

                  {/* ── Sous-tuiles ── */}
                  {!editTileSeparator && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />Sous-tuiles</Label>
                      <Button size="sm" variant="outline" type="button" className="h-7 text-xs"
                        onClick={() => setAddSubOpen(v => !v)}>
                        <Plus className="h-3 w-3 mr-1" />{addSubOpen ? 'Annuler' : 'Ajouter'}
                      </Button>
                    </div>
                    {editSubTiles.map((st, i) => {
                      const Ic = ICON_MAP[st.icon] ?? ExternalLink;
                      return (
                        <div key={st.id} className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
                          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${st.gradient} shrink-0`}>
                            <Ic className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="text-sm flex-1 truncate">{st.label}</span>
                          {st.url && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />}
                          {st.content && <FileText className="h-3 w-3 text-muted-foreground shrink-0" />}
                          <button type="button" onClick={() => setEditSubTiles(prev => prev.filter((_, j) => j !== i))}
                            className="p-1 text-muted-foreground hover:text-destructive shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {addSubOpen && (
                      <div className="space-y-2.5 p-3 border rounded-lg bg-muted/10">
                        <Input value={newSubLabel} onChange={e => setNewSubLabel(e.target.value)} placeholder="Nom de la sous-tuile *" />
                        <Input value={newSubUrl} onChange={e => setNewSubUrl(e.target.value)} placeholder="URL (optionnel)" type="url" />
                        <Textarea value={newSubContent} onChange={e => setNewSubContent(e.target.value)} placeholder="Texte affiché si pas d'URL (optionnel)" rows={2} className="resize-none" />
                        <div className="grid grid-cols-6 gap-1">
                          {ICON_OPTIONS.map(k => { const Ic = ICON_MAP[k]; return (
                            <button key={k} type="button" onClick={() => setNewSubIcon(k)}
                              className={cn('p-1.5 rounded border flex items-center justify-center', newSubIcon === k ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                              {Ic && <Ic className="h-3 w-3" />}
                            </button>
                          ); })}
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {GRADIENT_PRESETS.map(g => (
                            <button key={g.value} type="button" onClick={() => setNewSubGradient(g.value)}
                              className={cn(`h-6 rounded bg-gradient-to-br ${g.value}`, newSubGradient === g.value ? 'ring-2 ring-offset-1 ring-foreground' : 'opacity-60 hover:opacity-100')} />
                          ))}
                        </div>
                        <Button size="sm" type="button" className="w-full" disabled={!newSubLabel.trim()} onClick={() => {
                          const subId = `sub_${slugify(newSubLabel) || Date.now()}`;
                          setEditSubTiles(prev => [...prev, { id: subId, label: newSubLabel.trim(), icon: newSubIcon, gradient: newSubGradient, url: newSubUrl.trim() || undefined, content: newSubContent.trim() || undefined }]);
                          setNewSubLabel(''); setNewSubUrl(''); setNewSubContent('');
                          setNewSubIcon('ExternalLink'); setNewSubGradient(GRADIENT_PRESETS[0].value);
                          setAddSubOpen(false);
                        }}>Confirmer la sous-tuile</Button>
                      </div>
                    )}
                  </div>
                  )} {/* fin !editTileSeparator sous-tuiles */}
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditTileId(null)}>Annuler</Button>
              <Button onClick={saveTileEdit} disabled={!editTileLabel.trim()}>Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog — Ajouter une tuile custom */}
        <Dialog open={addTileOpen} onOpenChange={v => { setAddTileOpen(v); if (!v) { setNewTileWide(false); setNewTilePinned(false); setNewTileDarkText(false); setNewTileBadge(''); setNewTileInternal(''); setNewTileSeparator(false); } }}>
          <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle tuile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Label *</Label>
                <Input value={newTileLabel} onChange={e => setNewTileLabel(e.target.value)} placeholder="Nom de la tuile" />
              </div>
              {/* Options rapides add */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'sep', label: 'Séparateur', icon: SeparatorHorizontal, val: newTileSeparator, set: setNewTileSeparator },
                  { key: 'wide', label: 'Double largeur', icon: Columns2, val: newTileWide, set: setNewTileWide },
                  { key: 'pin', label: 'Épingler', icon: Pin, val: newTilePinned, set: setNewTilePinned },
                  { key: 'dark', label: 'Texte sombre', icon: SunDim, val: newTileDarkText, set: setNewTileDarkText },
                ].map(({ key, label, icon: Ic, val, set }) => (
                  <button key={key} type="button" onClick={() => set(!val)}
                    className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors', val ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
                    <Ic className="h-3.5 w-3.5 shrink-0" />{label}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Badge <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                <Input value={newTileBadge} onChange={e => setNewTileBadge(e.target.value)} placeholder="Nouveau, Urgent…" maxLength={12} />
              </div>
              {!newTileSeparator && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><NavigationArrow className="h-3.5 w-3.5" />Lien interne <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                  <select value={newTileInternal} onChange={e => setNewTileInternal(e.target.value)}
                    className="w-full text-sm rounded-md border border-input bg-background px-3 py-2">
                    <option value="">— Aucun lien interne —</option>
                    {INTERNAL_PATHS.map(p => <option key={p.path} value={p.path}>{p.label}</option>)}
                  </select>
                </div>
              )}
              {!newTileSeparator && (
              <div className="space-y-1.5">
                <Label>URL <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                <Input value={newTileUrl} onChange={e => setNewTileUrl(e.target.value)} placeholder="https://... — laisser vide si non applicable" type="url" />
              </div>
              <div className="space-y-1.5">
                <Label>Contenu <span className="text-muted-foreground font-normal">(optionnel — affiché si pas d'URL)</span></Label>
                <div
                  className={cn('space-y-2 rounded-lg border-2 border-dashed p-1 transition-colors', isDraggingOverNew ? 'border-primary bg-primary/5' : 'border-transparent')}
                  onDragOver={e => { e.preventDefault(); setIsDraggingOverNew(true); }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingOverNew(false); }}
                  onDrop={async (e) => {
                    e.preventDefault(); setIsDraggingOverNew(false);
                    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                    if (!files.length) return;
                    setIsUploadingNewBlock(true);
                    for (const file of files) { const url = await uploadTileImage(file); if (url) setNewBlocks(prev => [...prev, { type: 'image', value: url }]); }
                    setIsUploadingNewBlock(false);
                  }}
                >
                  {isDraggingOverNew && newBlocks.length === 0 && (
                    <p className="text-center text-xs text-primary py-3">Déposer l'image ici</p>
                  )}
                  {newBlocks.map((block, i) => (
                    <div key={i} className="relative border rounded-lg p-2 pr-8 bg-muted/20">
                      {block.type === 'text' ? (
                        <Textarea
                          value={block.value}
                          onChange={e => setNewBlocks(prev => prev.map((b, j) => j === i ? { ...b, value: e.target.value } : b))}
                          placeholder="Votre texte…"
                          rows={3}
                          className="resize-none border-0 p-0 shadow-none focus-visible:ring-0 bg-transparent"
                        />
                      ) : (
                        <img src={block.value} alt="" className="max-h-40 rounded object-contain" />
                      )}
                      <button type="button" onClick={() => setNewBlocks(prev => prev.filter((_, j) => j !== i))} className="absolute top-1.5 right-1.5 p-1 text-muted-foreground hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" type="button" onClick={() => setNewBlocks(prev => [...prev, { type: 'text', value: '' }])}>
                    <FileText className="h-3.5 w-3.5 mr-1.5" />Texte
                  </Button>
                  <Button size="sm" variant="outline" type="button" disabled={isUploadingNewBlock} onClick={() => newBlockImageRef.current?.click()}>
                    {isUploadingNewBlock ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                    Image
                  </Button>
                  <input ref={newBlockImageRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    setIsUploadingNewBlock(true);
                    const url = await uploadTileImage(file);
                    if (url) setNewBlocks(prev => [...prev, { type: 'image', value: url }]);
                    setIsUploadingNewBlock(false); e.target.value = '';
                  }} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Icône</Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {ICON_OPTIONS.map(iconKey => {
                    const Ic = ICON_MAP[iconKey];
                    return (
                      <button
                        key={iconKey}
                        onClick={() => setNewTileIcon(iconKey)}
                        className={cn('p-2 rounded-lg border flex items-center justify-center transition-colors', newTileIcon === iconKey ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}
                        title={iconKey}
                      >
                        {Ic && <Ic className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Couleur</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {GRADIENT_PRESETS.map(g => (
                    <button
                      key={g.value}
                      onClick={() => setNewTileGradient(g.value)}
                      className={cn(`h-8 rounded-lg bg-gradient-to-br ${g.value} transition-all`, newTileGradient === g.value ? 'ring-2 ring-offset-2 ring-foreground' : 'opacity-70 hover:opacity-100')}
                      title={g.label}
                    />
                  ))}
                </div>
              </div>
              )} {/* fin !newTileSeparator */}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddTileOpen(false)}>Annuler</Button>
              <Button onClick={addCustomTile} disabled={!newTileLabel.trim()}>Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sheet — Sous-tuiles */}
        <Sheet open={!!openSubTilesSheet} onOpenChange={open => !open && setOpenSubTilesSheet(null)}>
          <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col overflow-y-auto">
            <SheetHeader className="shrink-0">
              <SheetTitle className="flex items-center gap-2">
                <button type="button" onClick={() => setOpenSubTilesSheet(null)} className="p-1 -ml-1 text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {openSubTilesSheet && (() => { const Ic = ICON_MAP[openSubTilesSheet.icon] ?? ExternalLink; return <Ic className="h-4 w-4 shrink-0" />; })()}
                {openSubTilesSheet?.label}
              </SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-3 mt-4 overflow-y-auto pb-6">
              {openSubTilesSheet?.subTiles?.map(st => {
                const Ic = ICON_MAP[st.icon] ?? ExternalLink;
                return (
                  <Card
                    key={st.id}
                    onClick={() => {
                      if (st.url) { window.open(st.url, '_blank', 'noopener'); return; }
                      if (st.content) { setOpenSubTileContent(st); }
                    }}
                    className="border-0 shadow-sm overflow-hidden cursor-pointer hover:shadow-md active:scale-95 transition-all select-none"
                  >
                    <div className={`bg-gradient-to-br ${st.gradient} p-5 flex flex-col items-center gap-3 text-white`}>
                      <div className="p-3 rounded-2xl bg-white/20"><Ic className="h-6 w-6" /></div>
                      <span className="text-sm font-semibold text-center leading-tight">{st.label}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>

        {/* Dialog — Contenu d'une sous-tuile */}
        <Dialog open={!!openSubTileContent} onOpenChange={open => !open && setOpenSubTileContent(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {openSubTileContent && (() => { const Ic = ICON_MAP[openSubTileContent.icon] ?? ExternalLink; return <Ic className="h-4 w-4 shrink-0" />; })()}
                {openSubTileContent?.label}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed py-2">
              {openSubTileContent?.content}
            </p>
          </DialogContent>
        </Dialog>

        {/* Sheet — Personnes recherchées */}
        <Sheet open={openTile === 'wanted'} onOpenChange={(open) => !open && setOpenTile(null)}>
          <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col overflow-y-auto">
            <SheetHeader className="shrink-0">
              <SheetTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Personnes recherchées
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto mt-4">
              <WantedPersonsPanel canEdit={canEditWanted} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Dialog — autres tuiles */}
        <Dialog open={!!dialogDef} onOpenChange={(open) => !open && setOpenTile(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{dialogDef?.title}</DialogTitle>
            </DialogHeader>
            {dialogDef && <dialogDef.Content />}
          </DialogContent>
        </Dialog>

        {/* Dialog — contenu texte d'une tuile custom */}
        <Dialog open={!!customContentTile} onOpenChange={(open) => !open && setCustomContentTile(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {customContentTile && (() => {
                  const Ic = ICON_MAP[customContentTile.icon] ?? ExternalLink;
                  return <Ic className="h-4 w-4 shrink-0" />;
                })()}
                {customContentTile?.label}
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              {(customContentTile?.blocks?.length
                ? customContentTile.blocks
                : customContentTile?.content
                  ? [{ type: 'text' as const, value: customContentTile.content }]
                  : []
              ).map((block, i) =>
                block.type === 'image'
                  ? <img key={i} src={block.value} alt="" className="rounded-lg max-w-full" />
                  : <p key={i} className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{block.value}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
