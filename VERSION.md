# Notes de Version

## Version 1.8.0 (Février 2026)

### 🎯 Points clés

Administration étendue avec toggles de visibilité pour toutes les pages, système d'export entièrement refondu avec modes détaillé/simplifié, navigation temporelle et exports HTML interactifs.

## Version 1.7.1 (Février 2026)

### 🎯 Points clés

Amélioration de l'ergonomie des Paramètres avec des sections déroulantes, déplacement du bouton d'installation, toggles de pages dans l'Admin et couleurs enrichies en mode sombre Coloré.

## Version 1.7.0 (Février 2026)

### 🎯 Points clés

Cette version corrige des bugs critiques de persistance des données de fraude et ajoute l'aperçu PDF direct dans l'historique.

### 🐛 Corrections critiques

#### Données de fraude manquantes
- **Titre tiers** et **Date de naissance** n'étaient pas sauvegardés lors de la création/modification des contrôles
- Les données disparaissaient après modification d'un contrôle car les listes n'étaient pas reconstruites
- Les montants associés (RNV, Titre tiers, etc.) n'étaient pas persistés
- Le mode offline ne transmettait pas ces champs

### ✨ Nouveautés

#### Aperçu PDF dans l'historique
- Bouton "Aperçu" directement dans la page Historique
- Prévisualisation dans un dialogue avec zoom, rotation et téléchargement
- Fonctionne avec les filtres actifs (date, type, recherche)

#### Export PDF groupé embarquement
- Export de toutes les missions filtrées en un seul document PDF
- Page de synthèse + rapports individuels par mission

#### Graphique de tendance fraude
- Évolution du taux de fraude par semaine ou par mois
- Toggle semaine/mois dans l'onglet Statistiques

### 🔧 Améliorations
- Mode sombre amélioré pour graphiques et cartes
- Vue grille pour les missions d'embarquement
- Filtres avancés dans l'onglet Embarquement

---

## Version 1.5.0 (Janvier 2026)

### ✨ Nouveautés

#### Notifications Push
Recevez des alertes directement sur votre appareil :
- Activez depuis la page Profil
- Notifications pour les mises à jour importantes
- Fonctionne même avec l'app en arrière-plan

#### Sauvegarde Offline Complète
Les contrôles sont maintenant sauvegardés localement :
- Créez des contrôles même sans connexion
- File d'attente automatique des actions
- Synchronisation transparente au retour en ligne
- Indicateur visuel du nombre d'actions en attente

#### Bouton "Installer l'app"
Accès rapide à l'installation PWA :
- Disponible dans le menu burger
- Section dédiée dans la page Profil
- Instructions adaptées iOS/Android

### 🔧 Améliorations

- Page Profil enrichie avec paramètres notifications
- Menu burger avec lien d'installation
- Documentation mise à jour

---

## Version 1.4.0 (Janvier 2026)

### 🎯 Points clés

#### Mode Hors-ligne
L'application fonctionne désormais sans connexion internet :
- Les données sont mises en cache localement
- Les actions sont enregistrées en file d'attente
- Synchronisation automatique au retour de la connexion
- Indicateur visuel de l'état de connexion

#### Indicateur de Synchronisation
- Affichage de la date/heure de dernière synchronisation
- Présent sur toutes les pages principales
- Bouton de synchronisation manuelle

#### Pagination Infinie
L'historique des contrôles charge maintenant progressivement :
- 50 contrôles chargés initialement
- Chargement automatique au scroll
- Limite totale de 10 000 contrôles

#### Filtres de Période
Le tableau de bord propose des filtres temporels :
- Aujourd'hui
- Cette semaine
- Ce mois
- Cette année
- Tout

### 🔧 Améliorations

#### Formulaire de Contrôle
- **STT 50€ et PV 100€** : Accès rapide en haut du formulaire
- **Tarif bord** : Déplacé juste avant les relevés d'identité
- Labels mis à jour (% → €) pour plus de clarté

### 🐛 Corrections

- Contrôles manquants dans l'historique (limite augmentée)
- Meilleure gestion des erreurs de synchronisation

---

## Migration

Aucune action requise - la mise à jour est transparente.

## Compatibilité

- Navigateurs modernes (Chrome, Firefox, Safari, Edge)
- Mobile responsive (iOS, Android)
- PWA installable
