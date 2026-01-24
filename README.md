# SNCF Contrôles

Application de gestion et suivi des contrôles ferroviaires pour les agents SNCF.

## 🚆 Fonctionnalités

### Contrôles
- **Contrôle à bord** : Saisie des contrôles effectués dans les trains (passagers, tarifs, PV)
- **Contrôle en gare/quai** : Saisie des contrôles en gare ou sur quai
- **Mode hors-ligne** : Synchronisation automatique des données à la reconnexion

### Statistiques
- Tableau de bord avec indicateurs clés (taux de fraude, voyageurs, PV)
- Filtrage par période (jour, semaine, mois, année)
- Graphiques de répartition par type de contrôle
- Historique complet avec pagination infinie

### Exports
- **PDF** : Rapport détaillé avec statistiques et tableau des contrôles
- **HTML** : Rapport web interactif
- **Email** : Génération de contenu mail formaté

### Gestion d'équipe
- Rôles : Agent, Manager, Admin
- Gestion des équipes et des membres
- Suivi des performances par équipe

## 🛠 Technologies

- **Frontend** : React 18, TypeScript, Vite
- **UI** : Tailwind CSS, shadcn/ui, Framer Motion
- **Backend** : Supabase (Auth, Database, Edge Functions)
- **State** : TanStack Query
- **Charts** : Recharts
- **PDF** : jsPDF + jspdf-autotable

## 📦 Installation

```bash
# Cloner le repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

## 🔧 Configuration

### Variables d'environnement

Créer un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📱 PWA

L'application est installable en tant que PWA avec :
- Support offline
- Synchronisation en arrière-plan
- Notifications push (optionnel)

## 🔐 Rôles et permissions

| Rôle | Permissions |
|------|-------------|
| Agent | Créer/voir ses contrôles |
| Manager | Voir contrôles équipe, gérer membres |
| Admin | Accès complet, gestion utilisateurs |

## 📊 Structure des données

### Contrôle
- Informations de base (date, heure, lieu)
- Compteurs voyageurs (total, en règle)
- Tarifs contrôle (STT 50€, STT 100€, RNV)
- PV (absence titre, invalide, refus)
- Tarifs bord (ventes exceptionnelles)
- Relevés d'identité (RI positive/négative)

## 🚀 Déploiement

L'application peut être déployée via :
- **Lovable** : Publish directement depuis l'interface
- **Netlify** : Configuration incluse (`netlify.toml`)
- **Vercel** : Configuration incluse (`vercel.json`)

## 📄 Licence

Propriétaire - SNCF

---

Développé avec [Lovable](https://lovable.dev)
