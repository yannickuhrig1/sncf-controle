# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.41] - 2026-03-10

### Ajouté
- Trains du jour : origin/destination modifiées dans le formulaire sauvegardées automatiquement dans le train (Supabase + localStorage)

## [1.10.40] - 2026-03-10

### Ajouté
- Trains du jour : partage équipe discret — bouton Users2 pour partager ses trains, chips équipe (icône Users2, opacité réduite) cliquables pour charger le train
- Realtime élargi : les trains partagés par les collègues apparaissent en temps réel

## [1.10.39] - 2026-03-10

### Ajouté
- Trains du jour synchronisés entre appareils via Supabase (table `daily_trains` + Realtime) — localStorage conservé comme cache offline

## [1.10.38] - 2026-03-10

### Modifié
- Infos > Présentation : sous-titre "Présentation de l'application" mis à jour

## [1.10.37] - 2026-03-10

### Modifié
- Infos > Présentation : renommage "Présentation Direction" → "Présentation de l'application"

## [1.10.36] - 2026-03-10

### Ajouté
- Infos > Présentation : ajout de la "Présentation Direction" (boutons Ouvrir + Télécharger) depuis le fichier HTML statique

## [1.10.35] - 2026-03-09

### Modifié
- Paramètres : Profil, Paramètres, Manager et Administration ne peuvent plus être retirés du menu (canDisable = false)

## [1.10.34] - 2026-03-09

### Ajouté
- Paramètres > Apparence : curseurs de réglage du **contraste** (Arrière-plan, Cartes, Navigation), identiques aux curseurs de luminosité — bouton Réinitialiser couvre les deux groupes

## [1.10.33] - 2026-03-09

### Corrigé
- Thèmes Pro et Moderne : dégradé d'ambiance désormais visible (règles CSS déplacées hors de `@layer base`, opacités en mode clair augmentées)

## [1.10.32] - 2026-03-09

### Modifié
- Infos : tuile "Tarification" supprimée ; "À propos de l'app" déplacée juste avant "Assistance"

## [1.10.31] - 2026-03-09

### Ajouté
- Dégradé de couleur sur tous les thèmes : Coloré (teal/rose), SNCF (rouge/bleu), Pro (bleu acier), Moderne (violet/indigo)
- Paramètres : slider "Dégradé" (0–200%) pour intensifier ou supprimer le dégradé de fond

### Modifié
- Animations Pro/Moderne : opacity retirée des keyframes pour permettre le contrôle via la variable CSS `--gi`

## [1.10.30] - 2026-03-09

### Ajouté
- Paramètres : slider "Navigation" pour régler la luminosité de la sidebar indépendamment du reste

## [1.10.29] - 2026-03-09

### Corrigé
- Présence en ligne : heartbeat toutes les 30s dans AppLayout pour maintenir le statut actif (évite "hors ligne" après déconnexion WebSocket silencieuse)
- Admin/Manager : écoute des events `join` et `leave` en plus de `sync` pour mise à jour instantanée

## [1.10.28] - 2026-03-09

### Modifié
- À propos : badge version dynamique (`__APP_VERSION__`), liste fonctionnalités mise à jour (export HTML interactif, PDF, historique adaptatif, KPI)

## [1.10.27] - 2026-03-09

### Modifié
- Export HTML : infos secondaires des cartes "trains sensibles" plus lisibles (13-12px bold, couleur renforcée)

## [1.10.26] - 2026-03-09

### Modifié
- Export HTML : infos secondaires des cartes KPI plus lisibles (kpi-sub 14px bold, kpi-label 11px)

## [1.10.25] - 2026-03-09

### Modifié
- Export HTML : suppression de la carte "Total encaissé hors PV" (doublon)
- Export HTML : ajout d'une carte "Total TC + PV + Bord" (nombre + montant €) à droite de "Ventes à bord"

## [1.10.24] - 2026-03-08

### Modifié
- Historique : commentaire affiché centré (police légèrement agrandie) entre la ligne voyageurs et le taux de fraude sur PC ; reste compact sur mobile

## [1.10.23] - 2026-03-08

### Modifié
- Historique : suppression des onglets "Contrôles" et "Embarquement"
- Historique : filtre "Train" → affiche toujours les contrôles
- Historique : filtre "Gare" → affiche les contrôles en gare + une section "Missions embarquement / débarquement" en dessous (avec header bleu distinctif)

## [1.10.22] - 2026-03-08

### Modifié
- Rapport HTML — Synthèse : libellés des cartes "Montant PV" → "PV" et "Montant bord exceptionnel" → "Bord exceptionnel"

## [1.10.21] - 2026-03-08

### Modifié
- Rapport HTML — section Synthèse : carte "Total encaissé" renommée "Tarif contrôle"
- Rapport HTML — section Synthèse : nouvelle carte "Montant bord exceptionnel" affichée à côté de "Montant PV" (uniquement si > 0)
- Rapport HTML — section Synthèse : le montant des tarifs à bord est maintenant affiché dans le tableau récapitulatif (au lieu de "—")
- Tableau PDF : ajout des colonnes "Bord" (tarif_bord_stt_50) et "Excep." (tarif_bord_stt_100) avec coloration bleue

## [1.10.20] - 2026-03-08

### Modifié
- Export rapport complet : suppression du choix "Type de rapport" — le mode "Les deux" (détaillé + simplifié) est maintenant fixe
- Export rapport complet : format par défaut passé de PDF à HTML

## [1.10.19] - 2026-03-08

### Modifié
- Historique : options de menu renommées "Tableau (PDF)" et "Tableau (HTML)" (suppression du mot "étendu")
- Export HTML : refonte complète avec recherche interactive par numéro de train, filtre par date, et cases à cocher par groupe de colonnes (Heure, Type, Trajet, T. Bord, Tarifs contrôle, PV, RI)
- L'export HTML est entièrement autonome (données embarquées en JSON, rendu dynamique côté navigateur)

## [1.10.18] - 2026-03-08

### Modifié
- Historique : suppression de l'option "Tableau compact (PDF)" du menu export — seul le tableau étendu est conservé
- Historique : ajout de l'export "Tableau étendu (HTML)" — génère un fichier `.html` avec les noms de colonnes complets et les couleurs par groupe (TC vert, PV rouge, taux fraude dynamique)
- Ajout de la fonction `exportTableToHTML` dans `exportUtils.ts`

## [1.10.17] - 2026-03-08

### Ajouté
- Historique : le bouton "Exporter" est maintenant un menu déroulant avec 3 options : Rapport complet (ExportDialog existant), Tableau compact PDF (colonnes abrégées) et Tableau étendu PDF (noms de colonnes complets)
- `exportTableToPDF` accepte un paramètre `mode: 'compact' | 'extended'` pour choisir les labels des en-têtes de colonnes

## [1.10.16] - 2026-03-07

### Modifié
- OnboardControl : suppression du menu déroulant dans l'historique — la liste est toujours visible, sans animation d'accordéon

## [1.10.15] - 2026-03-07

### Modifié
- OnboardControl : suppression de la barre de recherche, du tri et des en-têtes de date dans l'historique — l'historique se filtre uniquement par numéro de train saisi dans le formulaire

## [1.10.14] - 2026-03-07

### Modifié
- OnboardControl : sans numéro de train saisi, l'historique affiche un message "Saisissez un numéro de train" au lieu de la liste vide

## [1.10.13] - 2026-03-07

### Modifié
- OnboardControl : l'historique en bas de page n'affiche que les contrôles du train saisi dans le formulaire ; le titre indique "Historique — Train XXXX" et le badge reflète le nombre filtré

## [1.10.12] - 2026-03-07

### Optimisé
- `AppLayout` : `burgerNavItems` et `bottomNavItems` convertis en `useMemo` (évite recalcul à chaque rendu)
- `AppLayout` : suppression du `refetchInterval: 60s` sur `openTicketsCount` (remplacé par `staleTime: 5min`, le realtime Supabase gère déjà l'invalidation)
- `Admin` : ajout de `staleTime` sur les 5 requêtes (profiles 5min, last-sign-in 30min, teams 10min, settings 10min, tickets 2min)
- `Admin` : `saveSupportContact`, `closeTicket`, `sendReply` enveloppés dans `useCallback`
- `useStationDepartures` : `fetchDepartures` et `reset` enveloppés dans `useCallback` + `AbortController` pour annuler les requêtes en vol lors d'une nouvelle recherche
- `useControls` : ajout de `staleTime: 2min` sur les 3 requêtes (controls, infinite, today)

## [1.10.11] - 2026-03-07

### Ajouté
- Départs/Arrivées en gare : bouton de géolocalisation — propose les 5 gares SNCF les plus proches avec la distance, clic pour charger directement
- Nouveau endpoint API `/api/sncf-nearby` (Navitia places_nearby par coordonnées GPS)

## [1.10.10] - 2026-03-06

### Ajouté
- Notifications temps réel : l'admin reçoit un toast dès qu'un nouveau ticket d'assistance arrive
- Notifications temps réel : l'agent reçoit un toast quand l'admin répond à son ticket
- Admin : réponse directe aux tickets depuis le dialogue (fil de discussion accordéon)
- Infos / Assistance : vue "Mes tickets" avec fil de réponses, réponse agent, marquage lu automatique
- Badge rouge sur la tuile "Assistance" indiquant les réponses non lues
- Badge admin nav combiné : approbations en attente + tickets ouverts
- Migration : table `support_replies`, colonne `has_unread_reply`, RPC `mark_ticket_read`

## [1.10.9] - 2026-03-06

### Amélioré
- Départs/Arrivées en gare : thème bleu SNCF pour les départs, vert pour les arrivées (bordure colorée + fond teinté)
- Départs/Arrivées : affichage du motif de retard (depuis les disruptions Navitia) en italique ambré sous la direction
- Départs/Arrivées : badge d'occupation du train (Peu chargé / Chargé / Très chargé / Complet) coloré selon le niveau
- hook `useStationDepartures` : extraction de `delayReason` et `occupancy` depuis la réponse Navitia

## [1.10.8] - 2026-03-06

### Ajouté
- Admin : gestion des coordonnées du support application (email + téléphone) dans l'onglet Intégrations
- Infos / Assistance : tuile pour signaler un bug ou envoyer un message à l'admin avec pièces jointes (images, PDF, texte)
- Admin : onglet "Assistance" (admin uniquement) pour voir et clôturer les tickets de support
- Migration Supabase : table `support_tickets`, bucket storage `support-attachments`, setting `support_contact`

## [1.10.6] - 2026-03-06

### Amélioré
- Infos / Départs en gare : toggle Départs ↔ Arrivées, clic sur un train → détail avec tous les arrêts + voie, proxy sncf-journey pour le vehicle_journey Navitia

## [1.10.5] - 2026-03-06

### Ajouté
- Infos : tuile "Départs en gare" — saisie d'une gare, affichage des prochains départs en temps réel (API SNCF Navitia) avec heure, retard, statut, voie et direction

## [1.10.4] - 2026-03-06

### Modifié
- Présentation HTML : mise à jour v1.10.3 — multi-agents en gare, vignette fusionnée historique, colonne commentaire, dernière connexion + présence en ligne, édition profil complète managers
- README : refonte complète reflétant toutes les fonctionnalités actuelles (v1.10.x)

## [1.10.3] - 2026-03-06

### Ajouté
- Admin & Manager : colonne "Dernière connexion" dans la liste des utilisateurs (RPC `get_users_last_sign_in`)
- Infos : tuile "Présentation" avec boutons Ouvrir, Télécharger et Envoyer par email
- Logo : icône ClipboardCheck (contrôleur) remplace Train partout (favicon, connexion, sidebar, burger)

## [1.10.2] - 2026-03-04

### Ajouté
- En gare : contrôle multi-agents — "Créer / Partager" une session (QR code + lien + SMS + email) pour que plusieurs agents rejoignent le même groupe de contrôle ; "Rejoindre" via code de gare ou URL `?station=NOM`
- Infos : tuile "Partager l'app" remplace "Ressources" — QR code de l'application + Copier / SMS / Email / Web Share API

## [1.10.1] - 2026-03-04

### Corrigé
- TrainGroupCard : badges Bord, TC, PV, RI désormais affichés dans l'en-tête agrégé du train/gare multi-agents
- TrainGroupCard sous-lignes agents : badge Bord (tarifs à bord) et RI+ ajoutés — tous les badges sont maintenant complets

## [1.10.0] - 2026-03-04

### Ajouté
- Historique : clic sur l'en-tête d'une vignette multi-agents ouvre une vue fusionnée (tous les contrôles du train/gare combinés en un seul)
- Historique vue tableau PC : colonne "Commentaire" affichée dans l'espace central
- Exports (PDF, email, tableau) : contrôles du même train le même jour fusionnés en une seule entrée

### Corrigé
- Admin.tsx : `isManager` manquant dans le destructuring `useAuth()` (page inaccessible pour les managers malgré le guard)
- Présentation SNCF : description RI positif corrigée + version mise à jour automatiquement

## [1.9.9] - 2026-03-04

### Ajouté
- Admin : dialogue d'édition complet (nom, prénom, téléphone, matricule, email + champs admin : rôle, équipe, approbation) — email lu via RPC `get_auth_user_email` (SECURITY DEFINER), sauvegardé via edge function `update-user`
- Admin : accès managers à la page `/admin` (onglet Utilisateurs) — champs rôle/équipe/approbation désactivés pour les managers
- Navigation : icône Admin visible pour les managers dans le menu latéral et la barre du bas
- RLS : fonction SQL `public.get_auth_user_email(uuid)` pour lire l'email depuis `auth.users`

## [1.9.8] - 2026-03-04

### Ajouté
- Historique : vignette globale multi-agent (`TrainGroupCard`) quand ≥ 2 contrôles détectés sur le même train ou la même gare le même jour — agrégats (voyageurs, fraudes, taux global) + sous-lignes par agent (avatar coloré, nom, heure, badges TC/PV/RI, taux individuel)
- Permissions : agents ne voient les boutons Modifier/Supprimer que sur leurs propres contrôles ; managers et admins peuvent modifier/supprimer tous les contrôles de leur équipe/périmètre
- RLS Supabase : politiques UPDATE et DELETE de la table `controls` étendues aux managers (leur équipe uniquement)

### Modifié
- Paramètres → Navigation : barre du bas marquée "(mobile uniquement)" ; menu burger renommé "Menu burger · Menu latéral (PC)" avec description expliquant que la config s'applique aussi au menu latéral PC

## [1.9.7] - 2026-03-04

### Ajouté
- Navigation : barre du bas et menu burger toujours visibles sur mobile, barre latérale seule sur desktop (plus de barre du bas sur desktop)
- Menu burger toujours affiché sur mobile (plus conditionnel à la préférence)
- Page "Infos" ajoutée dans les options de navigation des Paramètres
- Admin : nouvel onglet "Présentation" avec iframe intégrant `presentation_sncf_controles.html`

## [1.9.6] - 2026-03-03

### Ajouté
- Flags "Train supprimé" et "Sur-occupation" : cases à cocher dans À bord et En gare (modes compact et étendu), sauvegardés en base de données
- Badges "Supprimé" (gris foncé) et "Sur-occ." (orange) sur les vignettes de l'Historique
- Sélection d'un jour spécifique dans l'Historique : date picker apparaît quand la période "Jour" est sélectionnée
- Affichage du commentaire (notes) en italique tronqué sur les vignettes de l'Historique
- Statistiques : graphique unique "Répartition des infractions" fusionnant PV (rouge/orange), Tarifs contrôle (vert) et Tarifs à bord (bleu) en un seul donut

### Modifié
- Validation à bord : 0 voyageurs autorisé si "Train supprimé" ou "Sur-occupation" est coché

## [1.9.5] - 2026-03-03

### Ajouté
- Graphique "Fraude par numéro de train" dans Statistiques : barres horizontales (top 15), colorées vert/amber/rouge selon le seuil, avec tooltip détaillé (taux, fraudes, voyageurs, contrôles)
- Info SNCF dans En gare : bouton "Info SNCF" ajouté au champ N° Train (modes compact et étendu), auto-remplit origine, destination, heure et quai si l'API retourne un quai
- Occupation du train : affichée sous le bouton Info SNCF si l'API SNCF la fournit (ex : "Places disponibles", "Peu de places", "Bondé")
- Filtre mois spécifique dans Historique : sélecteurs mois + année apparaissent quand la période "Mois" est sélectionnée ; sélecteur année seul pour la période "Année"

### Supprimé
- Tableau des départs en temps réel (DeparturesBoard) retiré de la page En gare

## [1.9.3] - 2026-03-01

### Ajouté
- Tableau des départs en gare (StationControl) : bouton "Départs" sous le champ Gare
- Panel Sheet avec tous les trains de la gare en temps réel (heure, retard, statut, destination, voie)
- Clic sur un train → charge automatiquement N° train, destination, heure dans le formulaire
- Proxy Vercel `/api/sncf-departures` pour les requêtes départs (token côté serveur)
- Clavier numérique activé sur le champ N° Train en gare

## [1.9.2] - 2026-03-01

### Ajouté
- Trains du jour : bouton Ajouter à côté de Info SNCF pour préparer sa mission
- Chips colorées par statut (vert/amber/rouge/gris) avec retard en gras
- Clic sur un chip charge le train sauvegardé (numéro, origine, destination, heure, gares)

### Modifié
- Renommage "Suppléments rapides" → "STT rapides" (Contrôle à bord et en gare)

## [1.9.1] - 2026-03-01

### Modifié
- Token SNCF déplacé vers proxy Vercel serverless (variable `SNCF_API_TOKEN`) — jamais exposé côté client
- Badge retard : délai affiché en gras (+X min) dans la pastille
- Champ numéro de train : clavier numérique activé sur mobile

## [1.9.0] - 2026-03-01

### Ajouté
- Intégration API SNCF (Navitia) : récupération automatique des infos train depuis le numéro
- Bouton "Info SNCF" dans le formulaire contrôle à bord : remplit origine, destination, heure, statut
- Toutes les gares de la ligne s'affichent dans les sélecteurs Origine / Destination
- Sélection d'une gare d'origine remplit automatiquement l'heure de départ
- Affichage du retard (+X min) dans les items de chaque gare
- Badge type de train (TGV, TER, OUIGO…), statut (À l'heure / Retard / Supprimé), durée, voie, heure d'arrivée
- Onglet "Intégrations" dans Administration pour configurer le token API SNCF

### Modifié
- Token API SNCF déplacé de Paramètres vers Administration → Intégrations

## [1.8.8] - 2026-03-01

### Technique
- Test déploiement Vercel après retour en repo public

## [1.8.7] - 2026-03-01

### Technique
- Test de déploiement Vercel après passage du repo en privé

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
