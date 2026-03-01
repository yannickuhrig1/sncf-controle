import jsPDF from 'jspdf';
import { formatFraudRate } from '@/lib/stats';
import type { ControlStats } from '@/lib/stats';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StatsDetailedData {
  tarifsControle: { stt50: number; rnv: number; titreTiers: number; docNaissance: number; autre: number };
  tarifsBord: { stt50: number; stt100: number; rnv: number; titreTiers: number; docNaissance: number; autre: number };
  totalBord: number;
}

export interface WeeklyTrendPoint {
  label: string;
  fraudRate: number;
  passengers: number;
  fraudCount: number;
}

export interface StatsShareData {
  stats: ControlStats;
  detailedStats: StatsDetailedData;
  periodLabel: string;
  dateRangeLabel: string;
  locationLabel?: string; // optionnel (absent sur Stats)
  pageTitle?: string;     // 'Tableau de bord' | 'Statistiques'
  trendData?: WeeklyTrendPoint[];
}

// ── Texte brut ─────────────────────────────────────────────────────────────────

export function buildStatsText({
  stats, detailedStats, periodLabel, dateRangeLabel,
  locationLabel, pageTitle = 'Tableau de bord',
}: StatsShareData): string {
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
  t += `  🚆 SNCF CONTRÔLES — ${pageTitle.toUpperCase()}\n`;
  t += `${sep}\n`;
  t += `  📅 Période  :  ${periodLabel}\n`;
  t += `  📆 Dates    :  ${dateRangeLabel}\n`;
  if (locationLabel && locationLabel !== 'Tous') t += `  📍 Lieu     :  ${locationLabel}\n`;
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

// ── HTML ───────────────────────────────────────────────────────────────────────

function buildTrendSVG(trendData: WeeklyTrendPoint[]): string {
  if (!trendData || trendData.length === 0) return '';
  const W = 760, H = 130, PADX = 8, PADY = 14, PADB = 22;
  const chartW = W - PADX * 2;
  const chartH = H - PADY - PADB;
  const maxRate = Math.max(...trendData.map(d => d.fraudRate), 1);
  const gap = chartW / trendData.length;
  const barW = Math.max(gap * 0.6, 4);

  const bars = trendData.map((d, i) => {
    const x = PADX + i * gap + (gap - barW) / 2;
    const barH = Math.max((d.fraudRate / maxRate) * chartH, 2);
    const y = PADY + chartH - barH;
    const color = d.fraudRate >= 10 ? '#ef4444' : d.fraudRate >= 5 ? '#f59e0b' : '#10b981';
    const label = d.label.length > 8 ? d.label.substring(0, 8) : d.label;
    return [
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${color}" rx="2" opacity="0.85"/>`,
      d.fraudRate > 0 ? `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 3).toFixed(1)}" font-size="7" text-anchor="middle" fill="#374151">${d.fraudRate.toFixed(1)}%</text>` : '',
      `<text x="${(x + barW / 2).toFixed(1)}" y="${(H - 4).toFixed(1)}" font-size="7" text-anchor="middle" fill="#9ca3af">${label}</text>`,
    ].join('');
  });

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible">
  <line x1="${PADX}" y1="${PADY + chartH}" x2="${W - PADX}" y2="${PADY + chartH}" stroke="#e5e7eb" stroke-width="0.8"/>
  ${bars.join('')}
</svg>`;
}

export function buildStatsHTML({
  stats, detailedStats, periodLabel, dateRangeLabel,
  locationLabel, pageTitle = 'Tableau de bord', trendData,
}: StatsShareData): string {
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
<title>${pageTitle} — SNCF Contrôles</title>
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
.sec-ttl{font-size:.9rem;font-weight:700;color:#374151;margin-bottom:.875rem;padding-left:.75rem;border-left:3px solid #6366f1}
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
.sr{display:flex;justify-content:space-between;align-items:center;padding:.28rem 1rem}
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
    <span class="hdr-title">${pageTitle}</span>
  </div>
  <div class="hdr-meta">
    <span class="meta">Période&nbsp;: <b>${periodLabel}</b></span>
    <span class="meta">Dates&nbsp;: <b>${dateRangeLabel}</b></span>
    ${locationLabel && locationLabel !== 'Tous' ? `<span class="meta">Lieu&nbsp;: <b>${locationLabel}</b></span>` : ''}
  </div>
</div>
<div class="wrap">
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
  <div class="sec-ttl">Détails</div>
  <div class="grid3">
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
  </div>` : ''}

  ${trendData && trendData.length > 1 ? `
  <div class="sec-ttl" style="margin-top:2rem">Tendance du taux de fraude (par semaine)</div>
  <div class="card" style="padding:1rem 1.25rem 0.75rem;margin-bottom:1.5rem">
    ${buildTrendSVG(trendData)}
    <div style="display:flex;gap:1rem;justify-content:center;margin-top:0.5rem">
      <span style="font-size:.65rem;color:#9ca3af;display:flex;align-items:center;gap:.3rem"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#10b981"></span>Faible</span>
      <span style="font-size:.65rem;color:#9ca3af;display:flex;align-items:center;gap:.3rem"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#f59e0b"></span>Modéré</span>
      <span style="font-size:.65rem;color:#9ca3af;display:flex;align-items:center;gap:.3rem"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#ef4444"></span>Élevé</span>
    </div>
  </div>` : ''}

  <footer>Généré le ${generatedAt} &nbsp;·&nbsp; SNCF Contrôles</footer>
</div>
</body>
</html>`;
}

// ── PDF ────────────────────────────────────────────────────────────────────────

export function buildStatsPDF({
  stats, detailedStats, periodLabel, dateRangeLabel,
  locationLabel, pageTitle = 'Tableau de bord', trendData,
}: StatsShareData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 15;
  const CW = W - M * 2;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 38, 'F');
  doc.setFillColor(30, 64, 175);
  doc.rect(W - 40, 0, 40, 38, 'F');
  doc.setFillColor(15, 23, 42);
  doc.rect(W - 40, 0, 15, 38, 'F');
  // SNCF badge
  doc.setFillColor(230, 57, 70);
  doc.roundedRect(M, 9, 16, 8, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SNCF', M + 8, 14.2, { align: 'center' });
  doc.setFontSize(14);
  doc.text(pageTitle, M + 19, 14.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(160, 185, 220);
  const metaParts = [`Periode : ${periodLabel}`, dateRangeLabel];
  if (locationLabel && locationLabel !== 'Tous') metaParts.push(locationLabel);
  doc.text(metaParts.join('   |   '), M, 26);

  let y = 48;

  // KPI Cards
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
    doc.setFillColor(k.r, k.g, k.b);
    doc.roundedRect(x, y, kpiW, 24, 2.5, 2.5, 'F');
    doc.setFillColor(k.dark[0], k.dark[1], k.dark[2]);
    doc.roundedRect(x, y + 12, kpiW, 12, 2.5, 2.5, 'F');
    doc.rect(x, y + 12, kpiW, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text(k.label, x + kpiW / 2, y + 5.5, { align: 'center' });
    doc.setFontSize(15);
    doc.text(k.value, x + kpiW / 2, y + 15, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(220, 235, 255);
    doc.text(k.sub, x + kpiW / 2, y + 21, { align: 'center' });
  });

  y += 32;

  if (stats.controlCount > 0) {
    // Section title
    doc.setFillColor(99, 102, 241);
    doc.rect(M, y, 3, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    doc.text('Détails', M + 5.5, y + 4.5);
    y += 11;

    const colW = (CW - 8) / 3;

    const drawCard = (
      cx: number, cy: number,
      title: string, total: number,
      rows: Array<[string, number]>,
      accR: number, accG: number, accB: number,
      bdgR: number, bdgG: number, bdgB: number,
    ): number => {
      const filtered = rows.filter(([, v]) => v > 0);
      const cardH = 14 + (filtered.length === 0 ? 7 : filtered.length * 6.5) + 3;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cx, cy, colW, cardH, 2.5, 2.5, 'F');
      doc.setDrawColor(230, 232, 235);
      doc.setLineWidth(0.25);
      doc.roundedRect(cx, cy, colW, cardH, 2.5, 2.5, 'S');
      doc.setFillColor(accR, accG, accB);
      doc.roundedRect(cx, cy, colW, 3.5, 2.5, 2.5, 'F');
      doc.rect(cx, cy + 1.5, colW, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(31, 41, 55);
      doc.text(title, cx + 3.5, cy + 9.5);
      const badgeStr = String(total);
      const bw = badgeStr.length * 2.2 + 5;
      doc.setFillColor(bdgR, bdgG, bdgB);
      doc.roundedRect(cx + colW - bw - 3, cy + 5.5, bw, 5.5, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text(badgeStr, cx + colW - bw / 2 - 3, cy + 9.5, { align: 'center' });
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

    drawCard(M, y, 'Tarifs contrôle', stats.tarifsControle,
      [['STT 50€', detailedStats.tarifsControle.stt50], ['RNV', detailedStats.tarifsControle.rnv],
       ['Titre tiers', detailedStats.tarifsControle.titreTiers], ['D.naissance', detailedStats.tarifsControle.docNaissance],
       ['Autre', detailedStats.tarifsControle.autre]],
      74, 222, 128, 22, 163, 74);

    drawCard(M + colW + 4, y, 'Procès-verbaux', stats.pv,
      [['STT 100€', stats.stt100], ['STT autre montant', stats.pvStt100], ['RNV', stats.pvRnv],
       ['Titre tiers', stats.pvTitreTiers], ['D.naissance', stats.pvDocNaissance], ['Autre', stats.pvAutre]],
      248, 113, 113, 220, 38, 38);

    const cx2 = M + (colW + 4) * 2;
    const bordH = drawCard(cx2, y, 'Tarifs à bord', detailedStats.totalBord,
      [['Tarif bord', detailedStats.tarifsBord.stt50], ['Tarif exceptionnel', detailedStats.tarifsBord.stt100],
       ['RNV', detailedStats.tarifsBord.rnv], ['Titre tiers', detailedStats.tarifsBord.titreTiers],
       ['D.naissance', detailedStats.tarifsBord.docNaissance], ['Autre', detailedStats.tarifsBord.autre]],
      96, 165, 250, 37, 99, 235);

    // RI card
    const riY = y + bordH + 4;
    const riCardH = 30;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx2, riY, colW, riCardH, 2.5, 2.5, 'F');
    doc.setDrawColor(230, 232, 235);
    doc.setLineWidth(0.25);
    doc.roundedRect(cx2, riY, colW, riCardH, 2.5, 2.5, 'S');
    doc.setFillColor(192, 132, 252);
    doc.roundedRect(cx2, riY, colW, 3.5, 2.5, 2.5, 'F');
    doc.rect(cx2, riY + 1.5, colW, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(31, 41, 55);
    doc.text("Relevés d'identité", cx2 + 3.5, riY + 9.5);
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

  // Trend chart (if data available and space permits)
  if (trendData && trendData.length > 1) {
    const chartY = 210;
    const chartH = 45;
    const chartXStart = M;
    const chartXEnd = W - M;
    const chartW2 = chartXEnd - chartXStart;

    doc.setFillColor(99, 102, 241);
    doc.rect(M, chartY - 7, 3, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    doc.text('Tendance du taux de fraude', M + 5.5, chartY - 2.5);

    const maxRate = Math.max(...trendData.map(d => d.fraudRate), 1);
    const gap = chartW2 / trendData.length;
    const barW2 = Math.max(gap * 0.65, 3);

    trendData.forEach((d, i) => {
      const x = chartXStart + i * gap + (gap - barW2) / 2;
      const barH2 = Math.max((d.fraudRate / maxRate) * chartH, 1);
      const barY = chartY + chartH - barH2;
      const [r, g, b] = d.fraudRate >= 10 ? [239, 68, 68] : d.fraudRate >= 5 ? [245, 158, 11] : [16, 185, 129];
      doc.setFillColor(r, g, b);
      doc.roundedRect(x, barY, barW2, barH2, 0.8, 0.8, 'F');
      if (d.fraudRate > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(r, g, b);
        doc.text(`${d.fraudRate.toFixed(1)}%`, x + barW2 / 2, barY - 1.5, { align: 'center' });
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(156, 163, 175);
      const lbl = d.label.length > 9 ? d.label.substring(0, 9) : d.label;
      doc.text(lbl, x + barW2 / 2, chartY + chartH + 5, { align: 'center' });
    });

    // Baseline
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(chartXStart, chartY + chartH, chartXEnd, chartY + chartH);
  }

  // Footer
  const _now = new Date();
  const genDate = _now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    + ' ' + _now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  doc.setFillColor(240, 244, 248);
  doc.rect(0, 284, W, 13, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(`Genere le ${genDate}  |  SNCF Controles`, W / 2, 292, { align: 'center' });

  return doc;
}
