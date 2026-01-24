# Notes de Version

## Version 1.4.0 (Janvier 2026)

### 🎯 Points clés

Cette version améliore significativement l'expérience utilisateur avec le support hors-ligne et une meilleure organisation des données.

### ✨ Nouveautés

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
