# SNCF Contrôles — v1.10.3

Application de gestion et suivi des contrôles ferroviaires pour les agents SNCF.

## Fonctionnalités

### Contrôles à bord & en gare
- **Contrôle à bord** : saisie en train — passagers, tarifs contrôle, PV, RI, tarifs à bord
- **Contrôle en gare** : saisie sur quai ou en gare, modes débarquement et embarquement
- **Mode compact** : 7 onglets (Info · STT rapides · TC · PV · Bord · RI · Notes) pour saisie terrain rapide
- **Session multi-agents en gare** : créer / rejoindre un groupe via QR code, lien, SMS ou email — chaque agent saisit ses propres trains, l'historique agrège automatiquement
- **API SNCF** : auto-remplissage Origine / Destination / Heure / Retard depuis l'API SNCF (proxy Vercel)
- **Mode hors-ligne** : synchronisation automatique à la reconnexion
- Flags "Train supprimé" et "Sur-occupation" par contrôle

### Statistiques & Tableau de bord
- Indicateurs clés du jour : taux de fraude, voyageurs, PV, recettes
- Calcul du taux de fraude : `(tarifsControle + PV + RI négatifs) / passagers × 100`
- Filtrage par période : Aujourd'hui / Semaine / Mois / Année / Personnalisée
- Graphiques Recharts : répartition fraude, taux par train, tendances
- Seuils de couleur configurables (vert / jaune / rouge)

### Historique
- Vue Liste (mobile + desktop) : cartes groupées par date, badges Bord · TC · PV · RI
- **Vignette multi-agents** : agrégation automatique quand ≥ 2 agents ont contrôlé le même train/jour; sous-lignes par agent + vue fusionnée au clic
- Vue Tableau (desktop) : colonnes réorganisables/masquables dont **Commentaire**, tri multi-colonnes
- Exports : HTML, PDF (portrait/paysage/auto), aperçu avant téléchargement, export groupé embarquement

### Gestion d'équipe (Manager)
- Créer et gérer plusieurs équipes, ajouter/retirer des agents
- Tableau de bord équipe avec KPIs, heatmap horaire, audit trail
- Accès à `/admin` pour éditer les profils des membres de son équipe
- **Présence en ligne** temps réel (point vert ●) + colonne "Dernière connexion"

### Administration (Admin)
- Gestion complète des utilisateurs : édition profil (nom, prénom, téléphone, matricule, email, rôle, équipe, approbation), suppression
- Seuils de fraude configurables, durée de rétention, visibilité pages
- Token API SNCF (proxy sécurisé)
- **Présence en ligne** temps réel + dernière connexion pour chaque utilisateur

### Infos utiles
- Tuiles : À propos · Taux de fraude · Tarification · FAQ · Contacts · Partager l'app · Présentation
- **Partager l'app** : QR code + copie lien + SMS + email + Web Share API
- **Présentation** : ouvrir, télécharger ou envoyer par email la présentation du projet

## Technologies

| Couche | Technologies |
|--------|-------------|
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Supabase (Auth, PostgreSQL, RLS, Edge Functions, Realtime) |
| State | TanStack Query v5 |
| Charts | Recharts |
| PDF | jsPDF + jspdf-autotable |
| Déploiement | Vercel (auto depuis `main`) |

## Installation

```bash
git clone <YOUR_GIT_URL>
cd sncf-controle
npm install
npm run dev
```

## Configuration

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Rôles et permissions

| Rôle | Permissions |
|------|-------------|
| Agent | Créer/voir/exporter ses propres contrôles |
| Manager | + Voir équipe · Gérer membres · Accès /admin (membres équipe) |
| Admin | Accès complet · Gestion utilisateurs · Configuration seuils |

## Calcul de la fraude

```
Taux = (Tarifs contrôle + PV + RI négatifs) / Passagers × 100
```

| Élément | Compte dans la fraude |
|---------|----------------------|
| Tarifs contrôle (STT, RNV…) | ✅ Oui |
| Procès-verbaux (PV) | ✅ Oui |
| RI négatifs | ✅ Oui |
| Tarifs à bord | ❌ Non |
| RI positifs | ❌ Non |

## PWA

Installable sur mobile et desktop avec support offline, icône sur l'écran d'accueil et raccourcis vers "À bord" et "En gare".

## Déploiement

Push sur `main` → déploiement automatique Vercel.

---

Propriétaire — SNCF · Usage interne
