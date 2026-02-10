# SNCF Contrôles

Application de gestion et suivi des contrôles ferroviaires pour les agents SNCF.

## 🚆 Fonctionnalités

### Contrôles
- **Contrôle à bord** : Saisie des contrôles effectués dans les trains (passagers, tarifs, PV)
- **Contrôle en gare/quai** : Saisie des contrôles en gare ou sur quai
- **Types de fraude complets** : STT 50€/100€, RNV, Titre tiers, Date de naissance, Autre
- **Mode hors-ligne** : Synchronisation automatique des données à la reconnexion
- **Historique dépliable** : Animation fluide avec framer-motion pour afficher/masquer l'historique

### Statistiques & Calculs
- Tableau de bord avec indicateurs clés (taux de fraude, voyageurs, PV)
- **Calcul du taux de fraude** : `(tarifsControle + PV + RI négatifs) / passagers × 100`
  - Les tarifs à bord ne comptent pas dans le taux de fraude
  - Les RI positifs ne comptent pas comme fraude (voyageur en règle)
  - Les RI négatifs sont comptabilisés comme fraude
- Filtrage par période (jour, semaine, mois, année)
- Graphiques de répartition par type de contrôle
- Historique complet avec pagination infinie

### Exports
- **HTML** : Rapport web interactif (format prioritaire)
- **PDF** : Rapport détaillé avec statistiques et tableau des contrôles (Portrait, Paysage, Auto)
- **Aperçu PDF** : Prévisualisation directe dans un dialogue avant téléchargement
- **Export groupé embarquement** : Export PDF de toutes les missions filtrées en un seul document
- Filtrage par période : Aujourd'hui, Ce mois, Mois spécifique, Cette année, Tout
- Option d'inclusion des statistiques avec infobulle explicative

### Infos Utiles
- **Page dédiée** (`/infos`) avec guides, FAQ et informations de référence
- Calcul du taux de fraude expliqué
- Types de tarification (STT, RNV, Titre tiers, D. naissance, RI+/RI-)
- Questions fréquentes sur l'utilisation de l'application
- **Contacts complets** : Numéros publics SNCF (3635, objets trouvés, accessibilité) et contacts internes (sûreté, urgences, support app)
- **Contrôle admin** : Possibilité de masquer la page pour tous les utilisateurs

### Gestion d'équipe
- Rôles : Agent, Manager, Admin
- Gestion des équipes et des membres
- Suivi des performances par équipe

### Administration
- Gestion des utilisateurs et équipes
- **Seuils de fraude configurables** : Définition des seuils vert/jaune/rouge
- **Visibilité page Infos** : Toggle pour masquer/afficher la page Infos utiles
- Durée de rétention des données (jusqu'à 10 ans)

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
| Admin | Accès complet, gestion utilisateurs, configuration seuils |

## 📊 Structure des données

### Contrôle
- Informations de base (date, heure, lieu)
- Compteurs voyageurs (total, en règle)
- Tarifs contrôle (STT 50€, STT 100€, RNV)
- PV (absence titre, invalide, refus)
- Tarifs bord (ventes exceptionnelles)
- Relevés d'identité (RI positive/négative)

### Calcul de la fraude
```
Taux de fraude = (tarifsControle + PV + RI négatifs) / totalPassagers × 100
```

| Élément | Compte dans la fraude |
|---------|----------------------|
| Tarifs contrôle | ✅ Oui |
| PV | ✅ Oui |
| RI négatifs | ✅ Oui |
| Tarifs à bord | ❌ Non |
| RI positifs | ❌ Non |

## 🚀 Déploiement

L'application peut être déployée via :
- **Lovable** : Publish directement depuis l'interface
- **Netlify** : Configuration incluse (`netlify.toml`)
- **Vercel** : Configuration incluse (`vercel.json`)

## 📄 Licence

Propriétaire - SNCF

---

Développé avec [Lovable](https://lovable.dev)
