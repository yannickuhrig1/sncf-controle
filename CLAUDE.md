# CLAUDE.md — SNCF Contrôles

## Version actuelle
**1.8.2** (synchronisé dans `package.json` et `CHANGELOG.md`)

## Stack
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (base de données + auth)
- Vercel (déploiement auto depuis la branche `main`)
- PWA (vite-plugin-pwa)

## Architecture clé

### Calcul du taux de fraude
```
(tarifs_controle + pv + ri_negative) / nb_passagers × 100
```
- Les tarifs à bord ne comptent **pas** dans le taux de fraude
- Les RI positifs ne comptent **pas** comme fraude
- Les RI négatifs **comptent** comme fraude

### Tarifs à bord — distinction bord / exceptionnel
- `tarif_bord_stt_50` = **Tarif bord** (billets mode "Bord" vendus à bord)
- `tarif_bord_stt_100` = **Tarif exceptionnel** (billets mode "Exceptionnel" vendus à bord)
- Attention : ne pas confondre avec STT 50€ / STT 100€ des tarifs contrôle ou PV

### Types de PV (Procès-verbaux)
- `stt_100` = STT 100€ (PV standard 100€)
- `pv_autre` + `pv_stt_100` / `pv_rnv` / `pv_titre_tiers` / `pv_doc_naissance` = PV divers
  - "STT autre montant" dans l'UI correspond à `pvStt100` / `pv_stt_100`

### Exports
- `src/lib/exportUtils.ts` — toute la logique d'export (HTML, PDF, email)
- `calculateExtendedStats()` — agrège les stats multi-contrôles
- `getControlDetails()` — détail par contrôle pour l'email
- `detailRow()` — helper HTML : retourne `''` si count=0 et amount=0

## Fichiers importants
| Fichier | Rôle |
|---------|------|
| `src/lib/exportUtils.ts` | Export HTML/PDF/email (1800+ lignes) |
| `src/pages/Dashboard.tsx` | Page d'accueil avec stats |
| `src/pages/History.tsx` | Historique des contrôles |
| `src/components/history/HistoryTableView.tsx` | Vue tableau de l'historique |
| `src/components/history/EmbarkmentHistoryView.tsx` | Vue embarquement |
| `src/lib/stats.ts` | Fonctions de stats partagées |
| `src/components/OnboardControl.tsx` | Formulaire contrôle à bord |

## Déploiement
Push sur `main` → Vercel déploie automatiquement.

## Conventions UI
- Dashboard : cartes par catégorie (Tarifs contrôle, PV, Tarifs à bord / exceptionnel, RI)
- Ne pas afficher les lignes à 0 dans les exports email
- Tarifs à bord renommés : STT 50€ → "Tarif bord", STT 100€ → "Tarif exceptionnel"
- STT 100€ dans PV → "STT autre montant" (pas "STT 100€")
