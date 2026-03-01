# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.6] - 2026-03-01

### Ajouté
- **Manager — Équipes** : Nouvel onglet "Équipes" permettant de créer plusieurs équipes, d'y ajouter/retirer des agents (avec recherche), et de transférer un agent d'une équipe à l'autre
- **Manager — Vue d'ensemble** : Colonne "Équipe" affichée si le manager gère plusieurs équipes
- **Manager** : Les KPI (contrôles du jour, heatmap) agrègent maintenant toutes les équipes du manager

## [1.8.5] - 2026-03-01

### Corrigé
- **Historique — popup détail** : Badges de résumé remplacés (STT/RNV/PV → Bord/TC/PV/RI)
- **Statistiques — sélecteur de date** : Navigation adaptée à la période choisie (semaine/mois/année)
- **CLAUDE.md** : Règle de mise à jour version + changelog à chaque publication

## [1.8.4] - 2026-03-01

### Ajouté
- **Historique — vignettes** : Badges Bord/TC/PV/RI remplacent STT/RNV/PV
- **Historique — popup détail** : "RI Positive/Négative" → "RI Positif/Négatif", "STT 50€/100€" → "Tarif bord/exceptionnel"
- **Paramètres** : Jauges de luminosité pour le fond et les cartes

## [1.8.3] - 2026-03-01

### Corrigé
- **Export HTML/PDF** : "RI Positive" → "RI Positif", "RI Négative" → "RI Négatif"

## [1.8.2] - 2026-02-27

### Corrigé
- **Taux de fraude** : Formule corrigée dans la vue liste et la vue tableau de l'historique — les RI négatifs étaient absents du calcul
- **Tableau historique** : Colonnes ne se tronquaient plus (overflow-hidden bloquait le scroll horizontal)
- **Export email** : Les lignes à 0 ne sont plus affichées (tarifs contrôle, PV, tarifs à bord)
- **Export email** : Suppression des traces "Absence : 0 | Invalide : 0 | Refus : 0" dans le détail par contrôle
- **Export email / HTML** : "STT100 PV" renommé en "STT autre montant" dans la section Procès-verbaux
- **Export HTML** : Section "Tarifs à bord — Ventes" affiche maintenant "Tarif bord" vs "Tarif exceptionnel" avec les montants

### Modifié
- **Dashboard — Tarifs contrôle** : STT 100€ retiré de cette section (ce sont des PV, pas des tarifs contrôle)
- **Dashboard — Procès-verbaux** : "STT100 PV" renommé en "STT autre montant"
- **Dashboard — Tarifs à bord** : Carte renommée "Tarifs à bord / exceptionnel", lignes "STT 50€" → "Tarif bord" et "STT 100€" → "Tarif exceptionnel"
- **Export HTML — Tarifs à bord** : Section renommée "Tarifs à bord / exceptionnel — Ventes", colonne Montant ajoutée

## [1.8.1] - 2026-02-10

### Ajouté
- **Export HTML : Graphique évolution fraude** : Graphique à barres de l'évolution du taux de fraude par jour
- **Export HTML : Trains sensibles** : Liste des trains classés par taux de fraude (top 10)
- **Export HTML : Nombre de fraudeurs** : Affiché sous le taux de fraude dans la vue d'ensemble
- **Export HTML : Nombre de trains contrôlés** : Nouvelle stat card dans la vue d'ensemble
- **Export HTML : Bouton Imprimer** : Bouton flottant pour impression directe
- **Export HTML : Masquer/Afficher sections** : Chaque section peut être repliée/dépliée

### Corrigé
- **Montants à 0 corrigés** : Les montants STT 50€ (=50€), STT 100€ (=100€) et PV sont maintenant calculés automatiquement si non renseignés
- **RI renommé** : "Contrôles ID" remplacé par "RI (Relevés d'identité)" avec affichage RI+/RI-
- **Synthèse renommée** : "Synthèse pour la direction (version simplifiée)" → "Synthèse"

## [1.8.0] - 2026-02-10

### Ajouté
- **Admin : Toggles de visibilité étendus** : Toutes les pages (Accueil, Contrôle à bord, Contrôle en gare, Statistiques, Historique, Infos utiles) peuvent être activées/désactivées pour la maintenance
- **Profil : Numéro de téléphone** : Champ numéro de téléphone ajouté dans le formulaire de profil
- **Export : Navigation semaine/mois/année** : Flèches précédent/suivant pour naviguer dans les périodes d'export
- **Export : Modes détaillé/simplifié** : 3 modes d'export — Détaillé (manager LAF), Simplifié (direction régionale), Les deux
- **Export HTML amélioré** : Liste des trains en haut avec liens ancres, tri par colonnes interactif, toggles pour masquer/afficher les types de données, seules les valeurs non nulles sont affichées dans les détails, montants totaux encaissés mis en avant

### Modifié
- Historique : filtre par quai supprimé
- Historique : bouton Aperçu PDF supprimé (doublon avec Exporter > Prévisualiser)
- Historique : bouton PDF dans le tri du tableau supprimé (doublon avec Exporter)

## [1.7.1] - 2026-02-10

### Ajouté
- **Sections déroulantes dans Paramètres** : Chaque section (Apparence, Navigation, Notifications, Données, Application) est désormais dans un menu déroulant pour plus de clarté
- **Bouton Installer l'app déplacé dans Paramètres** : Déplacé depuis le Profil vers la section Application des Paramètres
- **Toggles de pages dans Admin > Affichage** : Interface améliorée avec toggles pour activer/désactiver chaque page depuis le panneau Admin

### Modifié
- Mode sombre Coloré amélioré : couleurs plus vibrantes et saturées pour les sections, graphiques et cartes statistiques
- Page Profil simplifiée (retrait de la section Application)
- Admin > Affichage restructuré avec section "Visibilité des pages"

## [1.7.0] - 2026-02-10

### Ajouté
- **Aperçu PDF dans l'historique** : Bouton "Aperçu" pour prévisualiser le rapport PDF directement dans un dialogue avant téléchargement
- **Export PDF groupé embarquement** : Export de toutes les missions filtrées en un seul PDF depuis l'onglet Embarquement
- **Graphique de tendance fraude** : Nouveau graphique d'évolution du taux de fraude par semaine/mois dans l'onglet Statistiques
- **Vue grille embarquement** : Mode de visualisation en cartes pour les missions d'embarquement
- **Filtres avancés embarquement** : Filtrage par gare, statut, plage de dates et recherche texte
- **Statistiques globales embarquement** : Résumé avec totaux trains, voyageurs et taux de fraude moyen

### Corrigé
- **Bug critique : Titre tiers et Date de naissance non sauvegardés** : Les fraudes de type "Titre tiers" et "Date de naissance" n'étaient pas incluses dans les données envoyées à la base lors de la création/modification d'un contrôle à bord
- **Bug : Données de fraude perdues en mode édition** : Lors de la modification d'un contrôle, les listes tarifsControle et pvList étaient initialisées à vide au lieu d'être reconstruites depuis les données en base
- **Bug : RNV et montants non persistés** : Les montants des RNV et autres tarifs n'étaient pas sauvegardés lors de la soumission du formulaire
- **Bug : Données offline incomplètes** : Le fallback offline n'incluait pas les champs titre_tiers, doc_naissance, autre_tarif et leurs montants

### Modifié
- Interface OnboardControl étendue avec tous les champs de fraude détaillés
- Notifications profil supprimées (doublon avec Paramètres)
- Mode sombre amélioré avec tokens CSS pour graphiques et cartes statistiques

## [1.6.0] - 2026-02-04

### Ajouté
- **Page Infos utiles** (`/infos`) : Nouvelle page de référence pour les contrôleurs
  - Explication du calcul du taux de fraude
  - Référence des types de tarification (STT, RNV, Titre tiers, etc.)
  - FAQ avec questions fréquentes
  - **Contacts complets** : Numéros publics SNCF (3635, objets trouvés, accessibilité) + contacts internes (sûreté 0 800 40 50 40, urgences 112/15/17, support app)
- **Toggle admin pour page Infos** : Les administrateurs peuvent masquer la page Infos pour tous les utilisateurs depuis Admin > Affichage
- **RI négatifs dans le taux de fraude** : Les relevés d'identité négatifs sont maintenant comptabilisés dans le calcul du taux de fraude
  - Nouvelle formule : `(tarifsControle + PV + RI négatifs) / passagers × 100`
  - Les RI positifs ne comptent pas (voyageur en règle)
- **Animation framer-motion** : L'historique des contrôles sur la page Onboard utilise maintenant framer-motion pour un déploiement fluide
- **Filtres d'export améliorés** :
  - Nouveau filtre "Mois" avec sélecteur de mois spécifique
  - Nouveau filtre "Année" 
  - Réorganisation : HTML avant PDF
  - Infobulle explicative sur l'option "Inclure les statistiques"
- **Filtre mois/année sur Historique** : Nouveau composant MonthYearFilter sur la page Historique principale

### Modifié
- Navigation mise à jour pour inclure la page Infos dans la barre basse et le menu burger
- Labels du dialogue d'export clarifiés ("Mois en cours" au lieu de "Ce mois")
- Couleurs des taux de fraude utilisent les tokens sémantiques (text-success, text-warning, text-destructive)
- Historique sur Onboard masqué par défaut, clic sur "Historique des contrôles" pour déplier

### Corrigé
- Transition de l'historique plus fluide avec AnimatePresence
- Cohérence des couleurs dans les exports

## [1.5.0] - 2026-01-25

### Ajouté
- **Notifications Push** : Alertes sur l'appareil pour les mises à jour et rappels
- **Sauvegarde offline** : Les contrôles créés hors-ligne sont sauvegardés localement
- **Synchronisation automatique** : Sync avec Supabase dès le retour de la connexion
- **Bouton "Installer l'app"** : Accès rapide depuis le profil et le menu burger
- **PWA complète** : Manifest, icônes, service worker pour expérience native

### Modifié
- Profil utilisateur enrichi avec paramètres notifications et installation
- Navigation burger avec lien d'installation

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
