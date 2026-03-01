import { useState, useMemo, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useControlsWithFilter, ViewMode, Period } from '@/hooks/useControlsWithFilter';
import { useLastSync } from '@/hooks/useLastSync';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { LastSyncIndicator } from '@/components/controls/LastSyncIndicator';
import { OfflineIndicator } from '@/components/controls/OfflineIndicator';
import { PendingControlsPanel } from '@/components/controls/PendingControlsPanel';
import { DashboardDatePicker } from '@/components/dashboard/DashboardDatePicker';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { ViewModeToggle } from '@/components/dashboard/ViewModeToggle';
import { calculateStats, formatFraudRate } from '@/lib/stats';
import jsPDF from 'jspdf';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  IdCard,
  LayoutDashboard,
  Loader2,
  Share2,
  Train,
  UserCheck,
  Users,
} from 'lucide-react';

type LocationFilter = 'all' | 'train' | 'station';
type EmailFormat = 'text' | 'html' | 'pdf';

interface DashboardShareData {
  stats: ReturnType<typeof calculateStats>;
  detailedStats: {
    tarifsControle: { stt50: number; rnv: number; titreTiers: number; docNaissance: number; autre: number };
    tarifsBord: { stt50: number; stt100: number; rnv: number; titreTiers: number; docNaissance: number; autre: number };
    totalBord: number;
  };
  periodLabel: string;
  dateRangeLabel: string;
  locationLabel: string;
}

function buildDashboardText({ stats, detailedStats, periodLabel, dateRangeLabel, locationLabel }: DashboardShareData): string {
  const sep  = '━'.repeat(42);
  const thin = '─'.repeat(42);
  const row  = (label: string, value: number) =>
    value === 0 ? '' : `   ▸  ${label.padEnd(22)}${value}\n`;
  const inRulePct = stats.totalPassengers > 0
    ? ` (${((stats.passengersInRule / stats.totalPassengers) * 100).toFixed(1)}%)`
    : '';
  const generatedAt = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  let t = '';
  t += `${sep}\n`;
  t += `  🚆 SNCF CONTRÔLES — Tableau de bord\n`;
  t += `${sep}\n`;
  t += `  📅 Période  :  ${periodLabel}\n`;
  t += `  📆 Dates    :  ${dateRangeLabel}\n`;
  if (locationLabel !== 'Tous') t += `  📍 Lieu     :  ${locationLabel}\n`;
  t += `\n`;

  t += `${sep}\n`;
  t += `  CHIFFRES CLÉS\n`;
  t += `${thin}\n`;
  t += `  👥  Voyageurs       ${String(stats.totalPassengers).padStart(5)}   (${stats.controlCount} contrôle${stats.controlCount > 1 ? 's' : ''})\n`;
  t += `  📊  Taux fraude     ${String(formatFraudRate(stats.fraudRate)).padStart(5)}   (${stats.fraudCount} fraude${stats.fraudCount !== 1 ? 's' : ''})\n`;
  t += `  ✅  En règle        ${String(stats.passengersInRule).padStart(5)}${inRulePct}\n`;
  t += `  📋  Procès-verbaux  ${String(stats.pv).padStart(5)}\n`;
  t += `\n`;

  if (stats.tarifsControle > 0) {
    t += `${sep}\n`;
    t += `  TARIFS CONTRÔLE  ·  Total : ${stats.tarifsControle}\n`;
    t += `${thin}\n`;
    t += row('STT 50€',     detailedStats.tarifsControle.stt50);
    t += row('RNV',         detailedStats.tarifsControle.rnv);
    t += row('Titre tiers', detailedStats.tarifsControle.titreTiers);
    t += row('D.naissance', detailedStats.tarifsControle.docNaissance);
    t += row('Autre',       detailedStats.tarifsControle.autre);
    t += `\n`;
  }

  if (stats.pv > 0) {
    t += `${sep}\n`;
    t += `  PROCÈS-VERBAUX  ·  Total : ${stats.pv}\n`;
    t += `${thin}\n`;
    t += row('STT 100€',          stats.stt100);
    t += row('STT autre montant', stats.pvStt100);
    t += row('RNV',               stats.pvRnv);
    t += row('Titre tiers',       stats.pvTitreTiers);
    t += row('D.naissance',       stats.pvDocNaissance);
    t += row('Autre',             stats.pvAutre);
    t += `\n`;
  }

  if (detailedStats.totalBord > 0) {
    t += `${sep}\n`;
    t += `  TARIFS À BORD  ·  Total : ${detailedStats.totalBord}\n`;
    t += `${thin}\n`;
    t += row('Tarif bord',         detailedStats.tarifsBord.stt50);
    t += row('Tarif exceptionnel', detailedStats.tarifsBord.stt100);
    t += row('RNV',                detailedStats.tarifsBord.rnv);
    t += row('Titre tiers',        detailedStats.tarifsBord.titreTiers);
    t += row('D.naissance',        detailedStats.tarifsBord.docNaissance);
    t += row('Autre',              detailedStats.tarifsBord.autre);
    t += `\n`;
  }

  if (stats.riPositive > 0 || stats.riNegative > 0) {
    t += `${sep}\n`;
    t += `  RELEVÉS D'IDENTITÉ\n`;
    t += `${thin}\n`;
    t += `   ▸  RI Positif              ${stats.riPositive}\n`;
    t += `   ▸  RI Négatif              ${stats.riNegative}\n`;
    t += `\n`;
  }

  t += `${sep}\n`;
  t += `  Généré le ${generatedAt}  ·  SNCF Contrôles\n`;
  t += `${sep}\n`;

  return t;
}

function buildDashboardHTML({ stats, detailedStats, periodLabel, dateRangeLabel, locationLabel }: DashboardShareData): string {
  const fraudColor = stats.fraudRate >= 10 ? 'red' : stats.fraudRate >= 5 ? 'amber' : 'emerald';
  const pvColor = stats.pv > 0 ? 'rose' : 'slate';
  const fraudBarW = Math.min(stats.fraudRate * 5, 100);
  const inRulePct = stats.totalPassengers > 0
    ? `${((stats.passengersInRule / stats.totalPassengers) * 100).toFixed(1)}% des voyageurs`
    : '0%';
  const generatedAt = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const row = (label: string, value: number) => value === 0 ? '' :
    `<div class="sr"><span class="sl">${label}</span><span class="sv">${value}</span></div>`;

  const kpiColors: Record<string, string> = {
    blue:   'linear-gradient(135deg,#3b82f6,#1d4ed8)',
    emerald:'linear-gradient(135deg,#10b981,#059669)',
    red:    'linear-gradient(135deg,#ef4444,#dc2626)',
    amber:  'linear-gradient(135deg,#f59e0b,#d97706)',
    rose:   'linear-gradient(135deg,#f43f5e,#e11d48)',
    slate:  'linear-gradient(135deg,#94a3b8,#64748b)',
  };
  const kpiShadow: Record<string, string> = {
    blue:   '0 6px 20px rgba(59,130,246,.4)',
    emerald:'0 6px 20px rgba(16,185,129,.4)',
    red:    '0 6px 20px rgba(239,68,68,.4)',
    amber:  '0 6px 20px rgba(245,158,11,.4)',
    rose:   '0 6px 20px rgba(244,63,94,.4)',
    slate:  '0 4px 12px rgba(100,116,139,.2)',
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tableau de bord — SNCF Contrôles</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:#f0f4f8;color:#1a1a2e;min-height:100vh}
.hdr{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#1e40af 100%);padding:2rem 2.5rem 1.75rem;position:relative;overflow:hidden}
.hdr::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 80% 50%,rgba(99,102,241,.25) 0%,transparent 65%)}
.hdr-top{display:flex;align-items:center;gap:.875rem;margin-bottom:1.1rem;position:relative}
.sncf-badge{background:#e63946;color:#fff;font-weight:900;font-size:.8rem;padding:.3rem .65rem;border-radius:5px;letter-spacing:.08em;box-shadow:0 2px 8px rgba(230,57,70,.5)}
.hdr-title{font-size:1.5rem;font-weight:800;color:#fff;letter-spacing:-.02em}
.hdr-meta{display:flex;flex-wrap:wrap;gap:.5rem 2rem;position:relative}
.meta{font-size:.78rem;color:rgba(255,255,255,.55)}
.meta b{color:rgba(255,255,255,.9);font-weight:600}
.wrap{max-width:820px;margin:0 auto;padding:2rem 1.5rem}
.kpi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;margin-bottom:2.25rem}
@media(min-width:560px){.kpi-grid{grid-template-columns:repeat(4,1fr)}}
.kpi{border-radius:14px;padding:1.25rem;color:#fff;position:relative;overflow:hidden}
.kpi::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.12) 0%,transparent 60%);pointer-events:none}
.kpi-lbl{font-size:.6rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.6);margin-bottom:.55rem;font-weight:600}
.kpi-val{font-size:2.4rem;font-weight:800;line-height:1;letter-spacing:-.03em}
.kpi-sub{font-size:.7rem;color:rgba(255,255,255,.6);margin-top:.35rem}
.kpi-bar{margin-top:.8rem;height:4px;background:rgba(255,255,255,.2);border-radius:9999px;overflow:hidden}
.kpi-fill{height:100%;background:rgba(255,255,255,.55);border-radius:9999px}
.sec-ttl{font-size:.9rem;font-weight:700;color:#374151;margin-bottom:.875rem;padding-left:.75rem;border-left:3px solid #6366f1;display:flex;align-items:center;justify-content:space-between}
.grid3{display:grid;grid-template-columns:1fr;gap:1rem}
@media(min-width:560px){.grid3{grid-template-columns:repeat(2,1fr)}}
@media(min-width:780px){.grid3{grid-template-columns:repeat(3,1fr)}}
.card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.05)}
.accent{height:4px}
.a-green{background:linear-gradient(90deg,#4ade80,#10b981)}
.a-red{background:linear-gradient(90deg,#f87171,#ef4444)}
.a-blue{background:linear-gradient(90deg,#60a5fa,#3b82f6)}
.a-purple{background:linear-gradient(90deg,#c084fc,#8b5cf6)}
.ch{padding:.875rem 1rem .5rem;display:flex;align-items:center;justify-content:space-between}
.ct{font-size:.78rem;font-weight:700;color:#1f2937}
.badge{font-size:.67rem;font-weight:700;padding:.18rem .55rem;border-radius:9999px}
.bg{background:#d1fae5;color:#065f46}.br{background:#fee2e2;color:#991b1b}
.bb{background:#dbeafe;color:#1e40af}.bp{background:#ede9fe;color:#5b21b6}
.sr{display:flex;justify-content:space-between;align-items:center;padding:.28rem 1rem;transition:background .1s}
.sl{font-size:.72rem;color:#6b7280}
.sv{font-size:.72rem;font-weight:700;background:#f3f4f6;padding:.12rem .5rem;border-radius:4px;color:#111827;min-width:1.75rem;text-align:center}
.empty{font-size:.72rem;color:#9ca3af;font-style:italic;padding:.4rem 1rem .875rem}
.pb{padding-bottom:.75rem}
.ri-wrap{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;padding:.75rem 1rem 1rem}
.ri-pos{background:#d1fae5;border-radius:10px;padding:.875rem;text-align:center}
.ri-neg{background:#fee2e2;border-radius:10px;padding:.875rem;text-align:center}
.ri-n{font-size:1.9rem;font-weight:800}
.ri-pos .ri-n{color:#059669}.ri-neg .ri-n{color:#dc2626}
.ri-l{font-size:.67rem;font-weight:700;margin-top:.2rem}
.ri-pos .ri-l{color:#065f46}.ri-neg .ri-l{color:#991b1b}
.col-stack{display:flex;flex-direction:column;gap:1rem}
footer{text-align:center;color:#9ca3af;font-size:.68rem;padding:1.5rem;border-top:1px solid #e5e7eb;margin-top:1.5rem}
</style>
</head>
<body>
<div class="hdr">
  <div class="hdr-top">
    <span class="sncf-badge">SNCF</span>
    <span class="hdr-title">Tableau de bord Contrôles</span>
  </div>
  <div class="hdr-meta">
    <span class="meta">Période&nbsp;: <b>${periodLabel}</b></span>
    <span class="meta">Dates&nbsp;: <b>${dateRangeLabel}</b></span>
    ${locationLabel !== 'Tous' ? `<span class="meta">Lieu&nbsp;: <b>${locationLabel}</b></span>` : ''}
  </div>
</div>

<div class="wrap">
  <!-- KPI -->
  <div class="kpi-grid">
    <div class="kpi" style="background:${kpiColors.blue};box-shadow:${kpiShadow.blue}">
      <div class="kpi-lbl">Voyageurs</div>
      <div class="kpi-val">${stats.totalPassengers}</div>
      <div class="kpi-sub">${stats.controlCount} contrôle${stats.controlCount > 1 ? 's' : ''}</div>
    </div>
    <div class="kpi" style="background:${kpiColors[fraudColor]};box-shadow:${kpiShadow[fraudColor]}">
      <div class="kpi-lbl">Taux de fraude</div>
      <div class="kpi-val">${formatFraudRate(stats.fraudRate)}</div>
      <div class="kpi-sub">${stats.fraudCount} fraude${stats.fraudCount !== 1 ? 's' : ''}</div>
      <div class="kpi-bar"><div class="kpi-fill" style="width:${fraudBarW}%"></div></div>
    </div>
    <div class="kpi" style="background:${kpiColors.emerald};box-shadow:${kpiShadow.emerald}">
      <div class="kpi-lbl">En règle</div>
      <div class="kpi-val">${stats.passengersInRule}</div>
      <div class="kpi-sub">${inRulePct}</div>
    </div>
    <div class="kpi" style="background:${kpiColors[pvColor]};box-shadow:${kpiShadow[pvColor]}">
      <div class="kpi-lbl">Procès-verbaux</div>
      <div class="kpi-val">${stats.pv}</div>
      <div class="kpi-sub">PV émis</div>
    </div>
  </div>

  ${stats.controlCount > 0 ? `
  <!-- Détails -->
  <div class="sec-ttl">Détails</div>
  <div class="grid3">
    <!-- Tarifs contrôle -->
    <div class="card">
      <div class="accent a-green"></div>
      <div class="ch"><span class="ct">Tarifs contrôle</span><span class="badge bg">${stats.tarifsControle}</span></div>
      ${row('STT 50€', detailedStats.tarifsControle.stt50)}
      ${row('RNV', detailedStats.tarifsControle.rnv)}
      ${row('Titre tiers', detailedStats.tarifsControle.titreTiers)}
      ${row('D.naissance', detailedStats.tarifsControle.docNaissance)}
      ${row('Autre', detailedStats.tarifsControle.autre)}
      ${stats.tarifsControle === 0 ? '<p class="empty">Aucun</p>' : '<div class="pb"></div>'}
    </div>
    <!-- PV -->
    <div class="card">
      <div class="accent a-red"></div>
      <div class="ch"><span class="ct">Procès-verbaux</span><span class="badge br">${stats.pv}</span></div>
      ${row('STT 100€', stats.stt100)}
      ${row('STT autre montant', stats.pvStt100)}
      ${row('RNV', stats.pvRnv)}
      ${row('Titre tiers', stats.pvTitreTiers)}
      ${row('D.naissance', stats.pvDocNaissance)}
      ${row('Autre', stats.pvAutre)}
      ${stats.pv === 0 ? '<p class="empty">Aucun</p>' : '<div class="pb"></div>'}
    </div>
    <!-- Bord + RI -->
    <div class="col-stack">
      <div class="card">
        <div class="accent a-blue"></div>
        <div class="ch"><span class="ct">Tarifs à bord</span><span class="badge bb">${detailedStats.totalBord}</span></div>
        ${row('Tarif bord', detailedStats.tarifsBord.stt50)}
        ${row('Tarif exceptionnel', detailedStats.tarifsBord.stt100)}
        ${row('RNV', detailedStats.tarifsBord.rnv)}
        ${row('Titre tiers', detailedStats.tarifsBord.titreTiers)}
        ${row('D.naissance', detailedStats.tarifsBord.docNaissance)}
        ${row('Autre', detailedStats.tarifsBord.autre)}
        ${detailedStats.totalBord === 0 ? '<p class="empty">Aucun</p>' : '<div class="pb"></div>'}
      </div>
      <div class="card">
        <div class="accent a-purple"></div>
        <div class="ch"><span class="ct">Relevés d'identité</span><span class="badge bp">${stats.riPositive + stats.riNegative}</span></div>
        <div class="ri-wrap">
          <div class="ri-pos"><div class="ri-n">${stats.riPositive}</div><div class="ri-l">RI Positif</div></div>
          <div class="ri-neg"><div class="ri-n">${stats.riNegative}</div><div class="ri-l">RI Négatif</div></div>
        </div>
      </div>
    </div>
  </div>
  ` : ''}

  <footer>Généré le ${generatedAt} &nbsp;·&nbsp; SNCF Contrôles</footer>
</div>
</body>
</html>`;
}

function buildDashboardPDF({ stats, detailedStats, periodLabel, dateRangeLabel, locationLabel }: DashboardShareData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 15; // margin
  const CW = W - M * 2; // content width

  // ── Header band ──────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 38, 'F');
  // Subtle accent stripe on right
  doc.setFillColor(30, 64, 175);
  doc.rect(W - 40, 0, 40, 38, 'F');
  doc.setFillColor(15, 23, 42);
  doc.rect(W - 40, 0, 15, 38, 'F'); // blend
  // SNCF badge
  doc.setFillColor(230, 57, 70);
  doc.roundedRect(M, 9, 16, 8, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SNCF', M + 8, 14.2, { align: 'center' });
  // Title
  doc.setFontSize(14);
  doc.text('Tableau de bord Contrôles', M + 19, 14.5);
  // Meta
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(160, 185, 220);
  const metaParts = [`Période : ${periodLabel}`, dateRangeLabel];
  if (locationLabel !== 'Tous') metaParts.push(locationLabel);
  doc.text(metaParts.join('   ·   '), M, 26);

  let y = 48;

  // ── KPI Cards ────────────────────────────────────────────────────
  const kpiW = (CW - 9) / 4;
  interface KpiDef { label: string; value: string; sub: string; r: number; g: number; b: number; dark: [number,number,number] }
  const kpis: KpiDef[] = [
    { label: 'VOYAGEURS', value: String(stats.totalPassengers),
      sub: `${stats.controlCount} contrôle${stats.controlCount > 1 ? 's' : ''}`,
      r: 59, g: 130, b: 246, dark: [29, 78, 216] },
    { label: 'TAUX FRAUDE', value: formatFraudRate(stats.fraudRate),
      sub: `${stats.fraudCount} fraude${stats.fraudCount !== 1 ? 's' : ''}`,
      ...(stats.fraudRate >= 10
        ? { r: 239, g: 68,  b: 68,  dark: [220, 38, 38]  as [number,number,number] }
        : stats.fraudRate >= 5
        ? { r: 245, g: 158, b: 11,  dark: [217, 119, 6]  as [number,number,number] }
        : { r: 16,  g: 185, b: 129, dark: [5, 150, 105]  as [number,number,number] }),
    },
    { label: 'EN RÈGLE', value: String(stats.passengersInRule),
      sub: stats.totalPassengers > 0 ? `${((stats.passengersInRule / stats.totalPassengers) * 100).toFixed(1)}%` : '0%',
      r: 16, g: 185, b: 129, dark: [5, 150, 105] },
    { label: 'PV', value: String(stats.pv), sub: 'Procès-verbaux',
      ...(stats.pv > 0
        ? { r: 244, g: 63,  b: 94,  dark: [225, 29, 72]  as [number,number,number] }
        : { r: 148, g: 163, b: 184, dark: [100, 116, 139] as [number,number,number] }),
    },
  ];

  kpis.forEach((k, i) => {
    const x = M + i * (kpiW + 3);
    // Card bg gradient simulation (two fills)
    doc.setFillColor(k.r, k.g, k.b);
    doc.roundedRect(x, y, kpiW, 24, 2.5, 2.5, 'F');
    doc.setFillColor(k.dark[0], k.dark[1], k.dark[2]);
    doc.roundedRect(x, y + 12, kpiW, 12, 2.5, 2.5, 'F');
    doc.rect(x, y + 12, kpiW, 4, 'F'); // blend overlap
    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text(k.label, x + kpiW / 2, y + 5.5, { align: 'center' });
    // Value
    doc.setFontSize(15);
    doc.text(k.value, x + kpiW / 2, y + 15, { align: 'center' });
    // Sub
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(220, 235, 255);
    doc.text(k.sub, x + kpiW / 2, y + 21, { align: 'center' });
  });

  y += 32;

  // ── Details Section ──────────────────────────────────────────────
  if (stats.controlCount > 0) {
    // Section title
    doc.setFillColor(99, 102, 241);
    doc.rect(M, y, 3, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    doc.text('Détails', M + 5.5, y + 4.5);
    y += 11;

    // Three-column layout
    const cols = 3;
    const colW = (CW - (cols - 1) * 4) / cols;

    // Helper: draw a detail card, returns card height
    const drawCard = (
      cx: number, cy: number,
      title: string, total: number,
      rows: Array<[string, number]>,
      accR: number, accG: number, accB: number,
      bdgR: number, bdgG: number, bdgB: number,
    ): number => {
      const filtered = rows.filter(([, v]) => v > 0);
      const innerH = filtered.length === 0 ? 7 : filtered.length * 6.5;
      const cardH = 14 + innerH + 3;
      // Card bg
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cx, cy, colW, cardH, 2.5, 2.5, 'F');
      doc.setDrawColor(230, 232, 235);
      doc.setLineWidth(0.25);
      doc.roundedRect(cx, cy, colW, cardH, 2.5, 2.5, 'S');
      // Accent bar
      doc.setFillColor(accR, accG, accB);
      doc.roundedRect(cx, cy, colW, 3.5, 2.5, 2.5, 'F');
      doc.rect(cx, cy + 1.5, colW, 2, 'F');
      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(31, 41, 55);
      doc.text(title, cx + 3.5, cy + 9.5);
      // Badge
      const badgeStr = String(total);
      const bw = badgeStr.length * 2.2 + 5;
      doc.setFillColor(bdgR, bdgG, bdgB);
      doc.roundedRect(cx + colW - bw - 3, cy + 5.5, bw, 5.5, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text(badgeStr, cx + colW - bw / 2 - 3, cy + 9.5, { align: 'center' });
      // Rows
      let ry = cy + 14;
      if (filtered.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(156, 163, 175);
        doc.text('Aucun', cx + 3.5, ry);
      } else {
        filtered.forEach(([lbl, val], idx) => {
          if (idx % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(cx + 0.5, ry - 4, colW - 1, 6.5, 'F');
          }
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(107, 114, 128);
          doc.text(lbl, cx + 3.5, ry);
          // Value pill
          const vs = String(val);
          const vw = vs.length * 2.2 + 5;
          doc.setFillColor(243, 244, 246);
          doc.roundedRect(cx + colW - vw - 2.5, ry - 3.5, vw, 5, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(17, 24, 39);
          doc.text(vs, cx + colW - vw / 2 - 2.5, ry, { align: 'center' });
          ry += 6.5;
        });
      }
      return cardH;
    };

    // Col 0 — Tarifs contrôle
    drawCard(M, y, 'Tarifs contrôle', stats.tarifsControle,
      [['STT 50€', detailedStats.tarifsControle.stt50], ['RNV', detailedStats.tarifsControle.rnv],
       ['Titre tiers', detailedStats.tarifsControle.titreTiers], ['D.naissance', detailedStats.tarifsControle.docNaissance],
       ['Autre', detailedStats.tarifsControle.autre]],
      74, 222, 128,  22, 163, 74);

    // Col 1 — PV
    drawCard(M + colW + 4, y, 'Procès-verbaux', stats.pv,
      [['STT 100€', stats.stt100], ['STT autre montant', stats.pvStt100], ['RNV', stats.pvRnv],
       ['Titre tiers', stats.pvTitreTiers], ['D.naissance', stats.pvDocNaissance], ['Autre', stats.pvAutre]],
      248, 113, 113,  220, 38, 38);

    // Col 2 — Tarifs à bord
    const cx2 = M + (colW + 4) * 2;
    const bordH = drawCard(cx2, y, 'Tarifs à bord', detailedStats.totalBord,
      [['Tarif bord', detailedStats.tarifsBord.stt50], ['Tarif exceptionnel', detailedStats.tarifsBord.stt100],
       ['RNV', detailedStats.tarifsBord.rnv], ['Titre tiers', detailedStats.tarifsBord.titreTiers],
       ['D.naissance', detailedStats.tarifsBord.docNaissance], ['Autre', detailedStats.tarifsBord.autre]],
      96, 165, 250,  37, 99, 235);

    // Col 2 — RI card below
    const riY = y + bordH + 4;
    const riCardH = 30;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx2, riY, colW, riCardH, 2.5, 2.5, 'F');
    doc.setDrawColor(230, 232, 235);
    doc.setLineWidth(0.25);
    doc.roundedRect(cx2, riY, colW, riCardH, 2.5, 2.5, 'S');
    // Purple accent
    doc.setFillColor(192, 132, 252);
    doc.roundedRect(cx2, riY, colW, 3.5, 2.5, 2.5, 'F');
    doc.rect(cx2, riY + 1.5, colW, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(31, 41, 55);
    doc.text("Relevés d'identité", cx2 + 3.5, riY + 9.5);
    // RI blocks
    const bw2 = (colW - 10) / 2;
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(cx2 + 3, riY + 12, bw2, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(5, 150, 105);
    doc.text(String(stats.riPositive), cx2 + 3 + bw2 / 2, riY + 22, { align: 'center' });
    doc.setFontSize(6);
    doc.setTextColor(6, 95, 70);
    doc.text('RI Positif', cx2 + 3 + bw2 / 2, riY + 25.5, { align: 'center' });
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(cx2 + 4 + bw2 + 3, riY + 12, bw2, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.text(String(stats.riNegative), cx2 + 4 + bw2 + 3 + bw2 / 2, riY + 22, { align: 'center' });
    doc.setFontSize(6);
    doc.setTextColor(153, 27, 27);
    doc.text('RI Négatif', cx2 + 4 + bw2 + 3 + bw2 / 2, riY + 25.5, { align: 'center' });
  }

  // ── Footer ───────────────────────────────────────────────────────
  const genDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  doc.setFillColor(240, 244, 248);
  doc.rect(0, 284, W, 13, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(`Généré le ${genDate}  ·  SNCF Contrôles`, W / 2, 292, { align: 'center' });

  return doc;
}

// Ligne compacte label / valeur pour les sections détail
function StatRow({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <div className="flex justify-between items-center px-2 py-1 rounded-md hover:bg-muted/50 transition-colors">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-bold bg-muted px-1.5 py-0.5 rounded-md min-w-[1.5rem] text-center">{value}</span>
    </div>
  );
}

const locationButtons: { value: LocationFilter; label: string; icon: React.ElementType }[] = [
  { value: 'all',     label: 'Tous',     icon: LayoutDashboard },
  { value: 'train',   label: 'À bord',   icon: Train },
  { value: 'station', label: 'En gare',  icon: Building2 },
];

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('all-data');
  const [period, setPeriod] = useState<Period>('day');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');

  // Email share dialog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailFormat, setEmailFormat] = useState<EmailFormat>('text');

  const { controls, isLoading: controlsLoading, isFetching, refetch, startDate, endDate } = useControlsWithFilter({
    date: selectedDate,
    viewMode,
    period,
    customStart: period === 'custom' ? customStart : null,
    customEnd:   period === 'custom' ? customEnd   : null,
  });

  const { formattedLastSync, updateLastSync } = useLastSync();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  const handleSync = useCallback(async () => {
    await refetch();
    updateLastSync();
    toast.success('Données synchronisées');
  }, [refetch, updateLastSync]);

  // Filtrage par lieu (client-side)
  const filteredByLocation = useMemo(() => {
    if (locationFilter === 'train')
      return controls.filter(c => c.location_type === 'train');
    if (locationFilter === 'station')
      return controls.filter(c => c.location_type === 'gare' || c.location_type === 'quai');
    return controls;
  }, [controls, locationFilter]);

  const stats = useMemo(() => calculateStats(filteredByLocation), [filteredByLocation]);

  // Calculs détaillés non présents dans calculateStats
  const detailedStats = useMemo(() => {
    const tarifsControle = filteredByLocation.reduce((acc, c) => ({
      stt50:       acc.stt50        + c.stt_50,
      stt100:      acc.stt100       + c.stt_100,
      rnv:         acc.rnv          + c.rnv,
      titreTiers:  acc.titreTiers   + (c.titre_tiers   || 0),
      docNaissance:acc.docNaissance + (c.doc_naissance  || 0),
      autre:       acc.autre        + (c.autre_tarif    || 0),
    }), { stt50: 0, stt100: 0, rnv: 0, titreTiers: 0, docNaissance: 0, autre: 0 });

    const tarifsBord = filteredByLocation.reduce((acc, c) => ({
      stt50:       acc.stt50        + (c.tarif_bord_stt_50        || 0),
      stt100:      acc.stt100       + (c.tarif_bord_stt_100       || 0),
      rnv:         acc.rnv          + (c.tarif_bord_rnv           || 0),
      titreTiers:  acc.titreTiers   + (c.tarif_bord_titre_tiers   || 0),
      docNaissance:acc.docNaissance + (c.tarif_bord_doc_naissance || 0),
      autre:       acc.autre        + (c.tarif_bord_autre         || 0),
    }), { stt50: 0, stt100: 0, rnv: 0, titreTiers: 0, docNaissance: 0, autre: 0 });

    const totalBord = tarifsBord.stt50 + tarifsBord.stt100 + tarifsBord.rnv
      + tarifsBord.titreTiers + tarifsBord.docNaissance + tarifsBord.autre;

    const totalPV = stats.pvStt100 + stats.pvRnv + stats.pvTitreTiers
      + stats.pvDocNaissance + stats.pvAutre;

    return { tarifsControle, tarifsBord, totalBord, totalPV };
  }, [filteredByLocation, stats]);

  // Partager — données résumé visible
  const periodLabels: Record<Period, string> = { day: 'Jour', week: 'Semaine', month: 'Mois', year: 'Année', custom: 'Personnalisée' };
  const locationLabels: Record<LocationFilter, string> = { all: 'Tous', train: 'À bord', station: 'En gare' };

  const shareData: DashboardShareData = useMemo(() => ({
    stats,
    detailedStats,
    periodLabel: periodLabels[period],
    dateRangeLabel: (() => {
      const fmt = (iso: string) => iso ? iso.split('-').reverse().join('-') : iso;
      return startDate === endDate ? fmt(startDate) : `${fmt(startDate)} → ${fmt(endDate)}`;
    })(),
    locationLabel: locationLabels[locationFilter],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [stats, detailedStats, period, startDate, endDate, locationFilter]);

  const filenameSuffix = startDate === endDate ? startDate : `${startDate}-${endDate}`;

  const handleExportHTML = useCallback(() => {
    try {
      const html = buildDashboardHTML(shareData);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      a.download = `tableau-bord-${filenameSuffix}.html`;
      a.click();
      toast.success('Export HTML téléchargé');
    } catch {
      toast.error('Erreur lors de l\'export HTML');
    }
  }, [shareData, filenameSuffix]);

  const handleExportPDF = useCallback(() => {
    try {
      const doc = buildDashboardPDF(shareData);
      doc.save(`tableau-bord-${filenameSuffix}.pdf`);
      toast.success('Export PDF téléchargé');
    } catch {
      toast.error('Erreur lors de l\'export PDF');
    }
  }, [shareData, filenameSuffix]);

  const handleEmailExport = useCallback(() => {
    try {
      if (emailFormat === 'text') {
        const body = buildDashboardText(shareData);
        const subject = `Tableau de bord SNCF — ${shareData.periodLabel} ${shareData.dateRangeLabel}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      } else if (emailFormat === 'html') {
        const html = buildDashboardHTML(shareData);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        a.download = `tableau-bord-${filenameSuffix}.html`;
        a.click();
        toast.success('Fichier HTML téléchargé — vous pouvez l\'envoyer en pièce jointe');
      } else {
        const doc = buildDashboardPDF(shareData);
        doc.save(`tableau-bord-${filenameSuffix}.pdf`);
        toast.success('Fichier PDF téléchargé — vous pouvez l\'envoyer en pièce jointe');
      }
      setEmailDialogOpen(false);
    } catch {
      toast.error('Erreur lors de l\'export');
    }
  }, [emailFormat, shareData, filenameSuffix]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isLoading = controlsLoading;

  return (
    <AppLayout>
      <div className="space-y-5 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-primary" />
                Tableau de bord
              </h1>
              <p className="text-sm text-muted-foreground">
                Bonjour {profile?.first_name} !
              </p>
            </div>
            <div className="flex items-center gap-2">
              <OfflineIndicator
                isOnline={isOnline}
                pendingCount={pendingCount}
                isSyncing={isSyncing}
              />
              <LastSyncIndicator
                lastSync={formattedLastSync}
                isFetching={isFetching}
                onSync={handleSync}
              />

              {/* Bouton Partager */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Partager</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportHTML}>
                    HTML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
                    Email…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <DashboardDatePicker
                date={selectedDate}
                onDateChange={setSelectedDate}
              />
              <ViewModeToggle
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <PeriodSelector
                selectedPeriod={period}
                onPeriodChange={setPeriod}
                customStart={customStart}
                customEnd={customEnd}
                onCustomStartChange={setCustomStart}
                onCustomEndChange={setCustomEnd}
              />
              {/* Filtre par lieu */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {locationButtons.map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-2.5 text-xs font-medium transition-colors gap-1",
                      locationFilter === value
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setLocationFilter(value)}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <PendingControlsPanel />

        {/* Raccourcis */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/onboard"
            className="group relative overflow-hidden rounded-xl bg-primary p-4 shadow-md hover:shadow-lg transition-all hover:scale-[1.01] text-primary-foreground flex flex-col gap-1.5"
          >
            <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <Train className="h-16 w-16" />
            </div>
            <div className="p-2 rounded-lg bg-white/20 w-fit">
              <Train className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm mt-1">Contrôle à bord</span>
            <span className="text-xs text-white/60">Nouveau contrôle en train</span>
          </Link>

          <Link
            to="/station"
            className="group relative overflow-hidden rounded-xl border-2 border-primary/15 bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-[1.01] flex flex-col gap-1.5"
          >
            <div className="absolute right-2 top-2 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Building2 className="h-16 w-16 text-primary" />
            </div>
            <div className="p-2 rounded-lg bg-primary/10 w-fit">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-sm mt-1">Contrôle en gare</span>
            <span className="text-xs text-muted-foreground">Nouveau contrôle en gare</span>
          </Link>
        </div>

        {/* KPIs principaux */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">
              {viewMode === 'my-data' ? 'Mes contrôles' : 'Tous les contrôles'}
            </h2>
            {locationFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {locationFilter === 'train' ? 'À bord' : 'En gare'}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

              {/* Voyageurs */}
              <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-xl bg-white/20">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">voyageurs</span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{stats.totalPassengers}</div>
                  <p className="text-xs text-white/65 mt-1">
                    {stats.controlCount} contrôle{stats.controlCount > 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              {/* Taux de fraude */}
              <Card className={cn(
                "border-0 shadow-md overflow-hidden text-white",
                stats.fraudRate >= 10 ? "bg-gradient-to-br from-red-500 to-rose-600" :
                stats.fraudRate >= 5  ? "bg-gradient-to-br from-amber-500 to-orange-500" :
                "bg-gradient-to-br from-emerald-500 to-green-600"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-xl bg-white/20">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">fraude</span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{formatFraudRate(stats.fraudRate)}</div>
                  <p className="text-xs text-white/65 mt-1">
                    {stats.fraudCount} fraude{stats.fraudCount !== 1 ? 's' : ''}
                  </p>
                  <div className="mt-2.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/50 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(stats.fraudRate * 5, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* En règle */}
              <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-xl bg-white/20">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">en règle</span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{stats.passengersInRule}</div>
                  <p className="text-xs text-white/65 mt-1">
                    {stats.totalPassengers > 0
                      ? `${((stats.passengersInRule / stats.totalPassengers) * 100).toFixed(1)}% des voyageurs`
                      : '0%'}
                  </p>
                </CardContent>
              </Card>

              {/* PV */}
              <Card className={cn(
                "border-0 shadow-md overflow-hidden text-white",
                stats.pv > 0 ? "bg-gradient-to-br from-rose-500 to-red-600" : "bg-gradient-to-br from-slate-400 to-slate-500"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-xl bg-white/20">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">PV</span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{stats.pv}</div>
                  <p className="text-xs text-white/65 mt-1">Procès-verbaux</p>
                </CardContent>
              </Card>

            </div>
          )}
        </div>

        {/* Sections détail */}
        {!isLoading && stats.controlCount > 0 && (
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Détails</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

              {/* Tarifs contrôle */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
                <CardHeader className="py-3 px-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <UserCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    Tarifs contrôle
                    <Badge className="ml-auto bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 text-xs">
                      {stats.tarifsControle}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-0.5">
                  <StatRow label="STT 50€"     value={detailedStats.tarifsControle.stt50} />
                  <StatRow label="RNV"         value={detailedStats.tarifsControle.rnv} />
                  <StatRow label="Titre tiers" value={detailedStats.tarifsControle.titreTiers} />
                  <StatRow label="D.naissance" value={detailedStats.tarifsControle.docNaissance} />
                  <StatRow label="Autre"       value={detailedStats.tarifsControle.autre} />
                  {stats.tarifsControle === 0 && (
                    <p className="text-xs text-muted-foreground italic px-2">Aucun</p>
                  )}
                </CardContent>
              </Card>

              {/* Procès-verbaux */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-red-400 to-rose-500" />
                <CardHeader className="py-3 px-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    </div>
                    Procès-verbaux
                    <Badge className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 text-xs">
                      {stats.pv}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-0.5">
                  <StatRow label="STT 100€"          value={stats.stt100} />
                  <StatRow label="STT autre montant" value={stats.pvStt100} />
                  <StatRow label="RNV"               value={stats.pvRnv} />
                  <StatRow label="Titre tiers"       value={stats.pvTitreTiers} />
                  <StatRow label="D.naissance"       value={stats.pvDocNaissance} />
                  <StatRow label="Autre"             value={stats.pvAutre} />
                  {stats.pv === 0 && (
                    <p className="text-xs text-muted-foreground italic px-2">Aucun</p>
                  )}
                </CardContent>
              </Card>

              {/* Tarifs à bord + RI */}
              <div className="space-y-3">
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
                  <CardHeader className="py-3 px-4 pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <CreditCard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      Tarifs à bord
                      <Badge className="ml-auto bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 text-xs">
                        {detailedStats.totalBord}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-0.5">
                    <StatRow label="Tarif bord"         value={detailedStats.tarifsBord.stt50} />
                    <StatRow label="Tarif exceptionnel" value={detailedStats.tarifsBord.stt100} />
                    <StatRow label="RNV"                value={detailedStats.tarifsBord.rnv} />
                    <StatRow label="Titre tiers"        value={detailedStats.tarifsBord.titreTiers} />
                    <StatRow label="D.naissance"        value={detailedStats.tarifsBord.docNaissance} />
                    <StatRow label="Autre"              value={detailedStats.tarifsBord.autre} />
                    {detailedStats.totalBord === 0 && (
                      <p className="text-xs text-muted-foreground italic px-2">Aucun</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-purple-400 to-violet-500" />
                  <CardHeader className="py-3 px-4 pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <IdCard className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      </div>
                      Relevés d'identité
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 grid grid-cols-2 gap-3">
                    <div className="flex flex-col items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20 py-3">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.riPositive}</div>
                      <div className="text-xs text-green-600/70 dark:text-green-400/70 font-medium mt-0.5">RI+</div>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 py-3">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.riNegative}</div>
                      <div className="text-xs text-red-600/70 dark:text-red-400/70 font-medium mt-0.5">RI−</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        )}

        {/* Dialog Email */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Envoyer par email</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <RadioGroup value={emailFormat} onValueChange={(v) => setEmailFormat(v as EmailFormat)} className="space-y-3">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="text" id="email-text" />
                  <Label htmlFor="email-text" className="cursor-pointer">
                    <span className="font-medium">Texte brut</span>
                    <span className="block text-xs text-muted-foreground">Ouvre votre client email avec le rapport en texte</span>
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="html" id="email-html" />
                  <Label htmlFor="email-html" className="cursor-pointer">
                    <span className="font-medium">HTML (fichier)</span>
                    <span className="block text-xs text-muted-foreground">Télécharge le rapport HTML à joindre à votre email</span>
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="pdf" id="email-pdf" />
                  <Label htmlFor="email-pdf" className="cursor-pointer">
                    <span className="font-medium">PDF (fichier)</span>
                    <span className="block text-xs text-muted-foreground">Télécharge le rapport PDF à joindre à votre email</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleEmailExport}>
                {emailFormat === 'text' ? 'Ouvrir email' : 'Télécharger'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
