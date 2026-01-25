# Notes de Version

## Version 1.5.0 (Janvier 2026)

### 🎯 Points clés

Cette version transforme l'application en **PWA complète** avec notifications push, sauvegarde offline et synchronisation automatique.

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
