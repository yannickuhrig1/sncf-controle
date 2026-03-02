# SNCF Contrôles

Application web progressive (PWA) de gestion et suivi des contrôles ferroviaires pour les agents SNCF.

**Version actuelle : 1.9.5**

---

## Fonctionnalités

### Contrôle à bord
- Saisie complète des contrôles effectués dans les trains
- Comptage voyageurs (total, en règle, en fraude)
- **Tarifs contrôle** : STT 50€, STT 100€, RNV, Titre tiers, Date de naissance, Autre
- **Procès-verbaux** : PV absence titre, PV invalide, PV refus, STT autre montant
- **Tarifs à bord** : Tarif bord (mode Bord), Tarif exceptionnel (mode Exceptionnel)
- **Relevés d'identité** : RI positif, RI négatif (comptabilisé comme fraude)
- **Intégration API SNCF** : auto-remplissage origine, destination, heure de départ, retard et statut du train par numéro de train
- **Trains du jour** : préparer sa liste de trains à l'avance avant de monter à bord
- Mode compact pour une saisie rapide sur terrain

### Contrôle en gare / quai
- Saisie des contrôles effectués en gare ou sur quai
- Mêmes types de tarification que le contrôle à bord
- **Tableau des départs en temps réel** : consulter les prochains trains depuis la gare choisie
- Popover retard au clic sur la pastille de statut d'un train (durée, raison)
- Trains préparés séparés pour une organisation claire

### Tableau de bord
- Indicateurs clés : taux de fraude, total voyageurs, total PV, montants collectés
- **Filtre par période** : Jour, Semaine, Mois, Année, **Période personnalisée** (date pickers)
- **Filtre par lieu** : Tous, À bord, En gare
- **Sélecteur de date adaptatif** selon la période sélectionnée
- **Bouton Partager** : export HTML, PDF ou envoi par email directement depuis le tableau de bord
- Graphiques de répartition par type de contrôle
- Dialog détaillé du taux de fraude avec explication du calcul

### Historique
- Vue liste et **vue tableau** (colonnes détaillées)
- **Colonnes réorganisables** par glisser-déposer et masquables individuellement
- Colonnes TC détaillées (RNV / Titre tiers / D. naissance) et PV détaillés
- Colonne "En fraude" et taux % par contrôle
- Filtrage par période, pagination infinie
- Popup de détail par contrôle avec badges catégorisés

### Statistiques
- Page dédiée avec calculs agrégés sur la période
- Export HTML, PDF et email depuis la page Statistiques
- Filtrage identique au tableau de bord

### Exports
- **HTML** : rapport web interactif, design premium, max-width 1750px, groupes colorés (TC vert / PV rouge)
- **PDF** : structure calquée sur le HTML, Portrait / Paysage / Auto, aperçu avant téléchargement
- **Email** : texte brut structuré, lignes à zéro masquées automatiquement
- **Export groupé embarquement** : PDF de toutes les missions filtrées en un seul document

### Navigation & Interface
- **Sidebar fixe sur PC** (dès 768px) avec accès à toutes les pages
- **Barre de navigation du bas** visible sur mobile et PC (offset sidebar sur grand écran)
- Fond premium avec gradient ambiant animé SNCF (rouge + bleu), dark mode adapté
- Affichage de la version et date de build sous le titre
- PWA installable sur PC et mobile (icône, raccourcis, mode standalone)

### Page Infos Utiles
- Restructurée en **tuiles cliquables** (clic → dialog avec contenu complet)
- **À propos de l'application** : description complète, menus disponibles, fonctionnalités
- Calcul du taux de fraude expliqué
- Types de tarification détaillés
- Questions fréquentes
- Contacts utiles (numéros SNCF publics + contacts internes)
- Ressources de référence

### Administration
- Gestion des utilisateurs (création, suppression avec confirmation)
- **Seuils de fraude configurables** : paliers vert / jaune / rouge
- **Visibilité page Infos** : toggle pour masquer/afficher pour tous les utilisateurs
- Durée de rétention des données (jusqu'à 10 ans)
- **Intégrations** : configuration du token API SNCF (proxy sécurisé via Vercel)
- Métriques et graphiques par équipe

### Gestion d'équipe (Manager)
- Rôles : Agent, Manager, Admin
- **Gestion multi-équipes** : créer des équipes, ajouter/retirer des agents
- Suivi des performances par équipe

### Paramètres utilisateur
- Persistés en base Supabase (synchronisés entre appareils)
- Thème (clair / sombre), fond d'écran, luminosité
- Menus repliés par défaut
- Jauges de statistiques premium

---

## Calcul du taux de fraude

```
Taux de fraude = (tarifsControle + PV + RI négatifs) / totalPassagers × 100
```

| Élément | Compte dans la fraude |
|---|---|
| Tarifs contrôle (STT, RNV, Titre tiers…) | ✅ Oui |
| Procès-verbaux | ✅ Oui |
| RI négatifs | ✅ Oui |
| Tarifs à bord (Tarif bord / Exceptionnel) | ❌ Non |
| RI positifs | ❌ Non |

---

## Technologies

| Couche | Technologie |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Supabase (Auth, PostgreSQL, Edge Functions) |
| State | TanStack Query v5 |
| Charts | Recharts |
| PDF | jsPDF + jspdf-autotable |
| PWA | vite-plugin-pwa (Workbox) |
| Déploiement | Vercel (auto depuis `main`) |

---

## Installation

```bash
git clone https://github.com/yannickuhrig1/sncf-controle.git
cd sncf-controle
npm install
npm run dev
```

## Variables d'environnement

Créer un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Le token API SNCF est configuré via les variables d'environnement Vercel (côté serveur, proxy sécurisé).

---

## Structure des fichiers clés

```
src/
├── pages/
│   ├── Dashboard.tsx          # Tableau de bord principal
│   ├── History.tsx            # Historique des contrôles
│   ├── OnboardControl.tsx     # Formulaire contrôle à bord
│   ├── StationControl.tsx     # Formulaire contrôle en gare
│   ├── Statistics.tsx         # Page statistiques
│   └── InfosUtiles.tsx        # Page infos avec tuiles
├── components/
│   ├── layout/AppLayout.tsx   # Layout principal (sidebar + bottom bar)
│   └── history/               # Composants historique (liste, tableau)
└── lib/
    ├── exportUtils.ts          # Logique export HTML/PDF/email
    └── stats.ts               # Fonctions de calcul partagées
```

---

## Déploiement

Push sur `main` → Vercel déploie automatiquement.

---

## Rôles et permissions

| Rôle | Permissions |
|---|---|
| Agent | Créer et consulter ses propres contrôles |
| Manager | Voir les contrôles de l'équipe, gérer les membres |
| Admin | Accès complet, gestion utilisateurs, configuration |

---

## Licence

Propriétaire — Usage interne SNCF
