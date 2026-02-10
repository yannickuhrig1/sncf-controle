

# Corrections de l'export HTML - Logique metier et montants

## Corrections a apporter

### 1. STT 100 dans les PV (pas dans Tarifs Controle)

Dans la section "Detail des operations" de l'export HTML, le STT 100 est actuellement affiche sous "Tarifs Controle (regularisations)". Il doit etre deplace dans la section "PV (proces-verbaux)".

**Fichier** : `src/lib/exportUtils.ts`
- Dans le template HTML (section "Tarifs Controle"), retirer la ligne `detailRow('STT 100', ...)` 
- L'ajouter dans la section "PV (proces-verbaux)"
- Recalculer les totaux : `totalTarifsControle` exclut `stt100`, `totalPV` inclut `stt100`

### 2. Total encaisse = Tarifs bord + Tarifs exceptionnels + Tarifs controle (sans PV)

Actuellement `totalEncaisse` additionne tout (tarifs controle + PV). Il faut le limiter aux tarifs bord, exceptionnels et controle uniquement.

**Fichier** : `src/lib/exportUtils.ts` (ligne ~582-583)
- Modifier le calcul de `totalEncaisse` pour exclure les montants PV
- Formule : `totalEncaisse = totalTarifsControle + montants tarifs bord`

### 3. Ajouter une stat card "Montant total PV"

Dans la section "Vue d'ensemble" du HTML, ajouter une carte supplementaire affichant le montant total des PV.

**Fichier** : `src/lib/exportUtils.ts` (dans le template HTML, section stats-grid)
- Ajouter une carte `stat-card red` avec `totalPV` en euros

### 4. Mettre a jour la section Synthese

La section simplifiee utilise aussi `totalEncaisse` - le corriger de la meme maniere et ajouter la ligne "Montant total PV".

---

## Detail technique

Toutes les modifications sont dans `src/lib/exportUtils.ts` :

1. **Ligne ~582-585** : Recalculer `totalTarifsControle` (sans stt100) et `totalPV` (avec stt100), `totalEncaisse` (sans PV)
2. **Ligne ~834-840** : Template HTML - Deplacer STT 100 de "Tarifs Controle" vers "PV"
3. **Ligne ~749-764** : Ajouter carte "Montant total PV" dans la vue d'ensemble
4. **Ligne ~908-911** : Corriger `totalEncaisse` dans la Synthese et ajouter "Montant total PV"

