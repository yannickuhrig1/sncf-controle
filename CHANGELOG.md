# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-01-24

### Ajouté
- **Indicateur de synchronisation** : Affichage de la dernière synchronisation sur toutes les pages
- **Mode hors-ligne** : Cache automatique des données avec synchronisation à la reconnexion
- **Pagination infinie** : Chargement progressif de l'historique au scroll
- **Filtres de période** : Aujourd'hui, semaine, mois, année, tout sur le tableau de bord

### Modifié
- Limite de récupération des contrôles augmentée à 10 000
- Réorganisation du formulaire OnboardControl (STT 50€/PV 100€ en accès rapide)
- Labels STT renommés de "%" vers "€" pour plus de clarté
- Tarif bord déplacé juste au-dessus des RI

## [1.3.0] - 2026-01-20

### Ajouté
- **Export PDF amélioré** : Statistiques détaillées, tarifs bord, breakdown PV
- **Export HTML** : Rapport web interactif avec design responsive
- **Export Email** : Génération de contenu formaté pour envoi par mail
- Numérotation automatique des pages dans les PDF

### Corrigé
- Fallback de sauvegarde PDF pour compatibilité navigateurs
- Gestion des erreurs d'export avec notifications toast

## [1.2.0] - 2026-01-15

### Ajouté
- **Tarifs à bord** : Section dédiée pour les ventes exceptionnelles
- **Breakdown des PV** : Détail par type (absence, invalide, refus, autre)
- **Montants** : Suivi des montants pour tous les types de tarifs

### Modifié
- Interface de saisie réorganisée pour un accès plus rapide
- Amélioration des statistiques avec calculs étendus

## [1.1.0] - 2026-01-10

### Ajouté
- **Contrôle en gare/quai** : Nouveau type de contrôle
- **Graphiques** : Visualisation des tendances de fraude
- **Historique** : Liste paginée des contrôles passés
- **Profil utilisateur** : Gestion des informations personnelles

### Modifié
- Navigation améliorée avec barre de menu configurable
- Thème sombre/clair avec variantes

## [1.0.0] - 2026-01-01

### Ajouté
- **Authentification** : Connexion/inscription avec Supabase Auth
- **Contrôle à bord** : Formulaire de saisie des contrôles trains
- **Tableau de bord** : Vue d'ensemble des statistiques
- **Gestion d'équipe** : Création et gestion des équipes
- **Rôles** : Agent, Manager, Admin avec permissions

---

## Types de changements

- `Ajouté` : Nouvelles fonctionnalités
- `Modifié` : Changements dans les fonctionnalités existantes
- `Déprécié` : Fonctionnalités qui seront supprimées prochainement
- `Supprimé` : Fonctionnalités supprimées
- `Corrigé` : Corrections de bugs
- `Sécurité` : Corrections de vulnérabilités
