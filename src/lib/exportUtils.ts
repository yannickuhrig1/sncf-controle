import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';
import { calculateStats, formatFraudRate } from './stats';

type Control = Database['public']['Tables']['controls']['Row'];

export type PdfOrientationType = 'portrait' | 'landscape' | 'auto';
export type ExportMode = 'detailed' | 'simplified' | 'both';

export interface ExportOptions {
  controls: Control[];
  title: string;
  dateRange: string;
  includeStats: boolean;
  orientation?: PdfOrientationType;
  exportMode?: ExportMode;
}

// ─── Color palette ───────────────────────────────────────────────────────────
const C = {
  navy:       [10,  20,  80]  as [number,number,number],
  navyMid:    [20,  40, 120]  as [number,number,number],
  navyLight:  [40,  70, 160]  as [number,number,number],
  gold:       [212,175,  55]  as [number,number,number],
  goldLight:  [245,215, 110]  as [number,number,number],
  green:      [22, 163,  74]  as [number,number,number],
  greenLight: [220,252, 231]  as [number,number,number],
  red:        [220,  38,  38] as [number,number,number],
  redLight:   [254, 226, 226] as [number,number,number],
  amber:      [245,158,  11]  as [number,number,number],
  amberLight: [254,243, 199]  as [number,number,number],
  blue:       [59, 130, 246]  as [number,number,number],
  blueLight:  [219,234, 254]  as [number,number,number],
  purple:     [139, 92, 246]  as [number,number,number],
  purpleLight:[237,233, 254]  as [number,number,number],
  teal:       [20, 184, 166]  as [number,number,number],
  tealLight:  [204,251, 241]  as [number,number,number],
  white:      [255,255, 255]  as [number,number,number],
  gray50:     [248,250, 252]  as [number,number,number],
  gray100:    [241,245, 249]  as [number,number,number],
  gray200:    [226,232, 240]  as [number,number,number],
  gray400:    [148,163, 184]  as [number,number,number],
  gray600:    [100,116, 139]  as [number,number,number],
  gray800:    [ 30, 41,  59]  as [number,number,number],
  black:      [  0,  0,   0]  as [number,number,number],
};

function getControlDetails(control: Control) {
  const fraudCount = control.tarifs_controle + control.pv + control.ri_negative;
  return {
    date: format(new Date(control.control_date), 'dd/MM/yyyy', { locale: fr }),
    time: control.control_time.slice(0, 5),
    location: control.location,
    locationType: control.location_type,
    platformNumber: control.platform_number || '-',
    trainNumber: control.train_number || '-',
    origin: control.origin || '-',
    destination: control.destination || '-',
    passengers: control.nb_passagers,
    inRule: control.nb_en_regle,
    tarifsControle: control.tarifs_controle,
    pv: control.pv,
    pvStt100: control.pv_stt100 || 0,
    pvRnv: control.pv_rnv || 0,
    pvTitreTiers: control.pv_titre_tiers || 0,
    pvAutre: control.pv_autre || 0,
    pvDocNaissance: control.pv_doc_naissance || 0,
    stt50: control.stt_50,
    stt50Amount: control.stt_50_amount || 0,
    stt100: control.stt_100,
    stt100Amount: control.stt_100_amount || 0,
    rnv: control.rnv,
    rnvAmount: control.rnv_amount || 0,
    titreTiers: control.titre_tiers || 0,
    titreTiersAmount: control.titre_tiers_amount || 0,
    docNaissance: control.doc_naissance || 0,
    docNaissanceAmount: control.doc_naissance_amount || 0,
    autreTarif: control.autre_tarif || 0,
    autreTarifAmount: control.autre_tarif_amount || 0,
    tarifBordStt50: control.tarif_bord_stt_50 || 0,
    tarifBordStt100: control.tarif_bord_stt_100 || 0,
    tarifBordRnv: control.tarif_bord_rnv || 0,
    tarifBordTitreTiers: control.tarif_bord_titre_tiers || 0,
    tarifBordDocNaissance: control.tarif_bord_doc_naissance || 0,
    tarifBordAutre: control.tarif_bord_autre || 0,
    riPositive: control.ri_positive,
    riNegative: control.ri_negative,
    notes: control.notes || '',
    fraudCount,
    fraudRate: control.nb_passagers > 0
      ? (fraudCount / control.nb_passagers) * 100
      : 0,
    fraudRateFormatted: control.nb_passagers > 0
      ? ((fraudCount / control.nb_passagers) * 100).toFixed(2) + '%'
      : '0.00%',
  };
}

function calculateExtendedStats(controls: Control[]) {
  const base = calculateStats(controls);

  const byLocationType = {
    train: controls.filter(c => c.location_type === 'train'),
    gare:  controls.filter(c => c.location_type === 'gare'),
    quai:  controls.filter(c => c.location_type === 'quai'),
  };

  const totalAmounts = controls.reduce((acc, c) => ({
    stt50:       acc.stt50       + ((c.stt_50_amount  || 0) > 0 ? c.stt_50_amount!  : c.stt_50  * 50),
    stt100:      acc.stt100      + ((c.stt_100_amount || 0) > 0 ? c.stt_100_amount! : c.stt_100 * 100),
    rnv:         acc.rnv         + (c.rnv_amount        || 0),
    titreTiers:  acc.titreTiers  + (c.titre_tiers_amount || 0),
    docNaissance:acc.docNaissance+ (c.doc_naissance_amount || 0),
    autre:       acc.autre       + (c.autre_tarif_amount || 0),
    pvStt100:      acc.pvStt100      + ((c.pv_stt100_amount || 0) > 0 ? c.pv_stt100_amount! : (c.pv_stt100 || 0) * 100),
    pvRnv:         acc.pvRnv         + ((c.pv_rnv_amount    || 0) > 0 ? c.pv_rnv_amount!   : (c.pv_rnv    || 0) * 100),
    pvTitreTiers:  acc.pvTitreTiers  + ((c.pv_titre_tiers_amount || 0) > 0 ? c.pv_titre_tiers_amount! : (c.pv_titre_tiers || 0) * 100),
    pvDocNaissance:acc.pvDocNaissance+ (c.pv_doc_naissance_amount || 0),
    pvAutre:       acc.pvAutre       + (c.pv_autre_amount   || 0),
  }), { stt50: 0, stt100: 0, rnv: 0, titreTiers: 0, docNaissance: 0, autre: 0,
        pvStt100: 0, pvRnv: 0, pvTitreTiers: 0, pvDocNaissance: 0, pvAutre: 0 });

  const pvBreakdown = controls.reduce((acc, c) => ({
    stt100:      acc.stt100      + (c.pv_stt100        || 0),
    rnv:         acc.rnv         + (c.pv_rnv           || 0),
    titreTiers:  acc.titreTiers  + (c.pv_titre_tiers   || 0),
    docNaissance:acc.docNaissance+ (c.pv_doc_naissance || 0),
    autre:       acc.autre       + (c.pv_autre         || 0),
  }), { stt100: 0, rnv: 0, titreTiers: 0, docNaissance: 0, autre: 0 });

  const tarifsBord = controls.reduce((acc, c) => ({
    stt50:              acc.stt50              + (c.tarif_bord_stt_50                  || 0),
    stt50Amount:        acc.stt50Amount        + (c.tarif_bord_stt_50_amount           || 0),
    stt100:             acc.stt100             + (c.tarif_bord_stt_100                 || 0),
    stt100Amount:       acc.stt100Amount       + (c.tarif_bord_stt_100_amount          || 0),
    rnv:                acc.rnv                + (c.tarif_bord_rnv                     || 0),
    rnvAmount:          acc.rnvAmount          + (c.tarif_bord_rnv_amount              || 0),
    titreTiers:         acc.titreTiers         + (c.tarif_bord_titre_tiers             || 0),
    titreTiersAmount:   acc.titreTiersAmount   + (c.tarif_bord_titre_tiers_amount      || 0),
    docNaissance:       acc.docNaissance       + (c.tarif_bord_doc_naissance           || 0),
    docNaissanceAmount: acc.docNaissanceAmount + (c.tarif_bord_doc_naissance_amount    || 0),
    autre:              acc.autre              + (c.tarif_bord_autre                   || 0),
    autreAmount:        acc.autreAmount        + (c.tarif_bord_autre_amount            || 0),
  }), { stt50: 0, stt50Amount: 0, stt100: 0, stt100Amount: 0, rnv: 0, rnvAmount: 0,
        titreTiers: 0, titreTiersAmount: 0, docNaissance: 0, docNaissanceAmount: 0,
        autre: 0, autreAmount: 0 });

  const tarifsControleDetails = controls.reduce((acc, c) => ({
    titreTiers:  acc.titreTiers  + (c.titre_tiers  || 0),
    docNaissance:acc.docNaissance+ (c.doc_naissance || 0),
    autre:       acc.autre       + (c.autre_tarif  || 0),
  }), { titreTiers: 0, docNaissance: 0, autre: 0 });

  return {
    ...base,
    byLocationType,
    totalAmounts,
    pvBreakdown,
    tarifsBord,
    tarifsControleDetails,
    totalTarifsBord: tarifsBord.stt50 + tarifsBord.stt100 + tarifsBord.rnv
      + tarifsBord.titreTiers + tarifsBord.docNaissance + tarifsBord.autre,
    totalTarifsBordAmount: tarifsBord.stt50Amount + tarifsBord.stt100Amount + tarifsBord.rnvAmount
      + tarifsBord.titreTiersAmount + tarifsBord.docNaissanceAmount + tarifsBord.autreAmount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  PDF helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Draw a filled rounded-rectangle approximation using a plain rect */
function fillRect(doc: jsPDF, x: number, y: number, w: number, h: number, color: [number,number,number]) {
  doc.setFillColor(...color);
  doc.rect(x, y, w, h, 'F');
}

/** Draw a horizontal rule */
function hRule(doc: jsPDF, x: number, y: number, w: number, color: [number,number,number], thickness = 0.4) {
  doc.setDrawColor(...color);
  doc.setLineWidth(thickness);
  doc.line(x, y, x + w, y);
}

/** Section title bar */
function sectionBar(doc: jsPDF, label: string, x: number, y: number, w: number, color: [number,number,number]) {
  fillRect(doc, x, y, w, 7, color);
  fillRect(doc, x, y, 2, 7, C.gold);          // Gold left accent
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(label.toUpperCase(), x + 5, y + 4.8);
  doc.setFont('helvetica', 'normal');
  return y + 9;
}

/** KPI mini-card */
function kpiCard(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string, value: string, sub: string,
  accent: [number,number,number]
) {
  fillRect(doc, x, y, w, h, C.gray50);
  fillRect(doc, x, y, w, 1.2, accent);           // Top accent bar
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accent);
  doc.text(value, x + w / 2, y + h / 2 + 1, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.gray600);
  doc.text(label.toUpperCase(), x + w / 2, y + h - 5.5, { align: 'center' });
  if (sub) {
    doc.setFontSize(6);
    doc.setTextColor(...C.gray400);
    doc.text(sub, x + w / 2, y + h - 2.5, { align: 'center' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  exportToPDF  (premium theme)
// ─────────────────────────────────────────────────────────────────────────────
export function exportToPDF({ controls, title, dateRange, includeStats, orientation = 'auto' }: ExportOptions): jsPDF {
  if (!controls || controls.length === 0) throw new Error('Aucun contrôle à exporter');

  const useOrientation = orientation === 'auto'
    ? (controls.length > 10 || includeStats ? 'landscape' : 'portrait')
    : orientation;

  const doc = new jsPDF({ orientation: useOrientation === 'landscape' ? 'landscape' : 'portrait' });
  const stats = calculateExtendedStats(controls);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const safeH = pageH - 16;
  let pageNumber = 1;
  let y = 46;

  // ── Données calculées (même que HTML) ─────────────────────────────────────
  const uniqueTrains = new Set(controls.filter(c => c.location_type === 'train').map(c => c.train_number)).size;
  const totalTarifsAmt = stats.totalAmounts.stt50 + stats.totalAmounts.rnv
    + stats.totalAmounts.titreTiers + stats.totalAmounts.docNaissance + stats.totalAmounts.autre;
  const totalPVAmt = stats.totalAmounts.stt100 + stats.totalAmounts.pvStt100
    + stats.totalAmounts.pvRnv + stats.totalAmounts.pvTitreTiers
    + stats.totalAmounts.pvDocNaissance + stats.totalAmounts.pvAutre;

  const trainGroups: Record<string, Control[]> = {};
  controls.forEach(c => {
    const key = c.train_number || c.location || 'Inconnu';
    if (!trainGroups[key]) trainGroups[key] = [];
    trainGroups[key].push(c);
  });
  const trainFraudStats = Object.keys(trainGroups).map(key => {
    const group = trainGroups[key];
    const totalPax   = group.reduce((s, c) => s + c.nb_passagers, 0);
    const totalFraud = group.reduce((s, c) => s + c.tarifs_controle + c.pv + c.ri_negative, 0);
    const rate = totalPax > 0 ? (totalFraud / totalPax) * 100 : 0;
    return { train: key, passengers: totalPax, fraudCount: totalFraud, rate, controlCount: group.length };
  }).sort((a, b) => b.rate - a.rate);

  const fraudByDate: Record<string, { pax: number; fraud: number }> = {};
  controls.forEach(c => {
    const d = c.control_date;
    if (!fraudByDate[d]) fraudByDate[d] = { pax: 0, fraud: 0 };
    fraudByDate[d].pax   += c.nb_passagers;
    fraudByDate[d].fraud += c.tarifs_controle + c.pv + c.ri_negative;
  });
  const chartData = Object.keys(fraudByDate).sort().map(d => ({
    date: format(new Date(d), 'dd/MM', { locale: fr }),
    rate: fraudByDate[d].pax > 0 ? (fraudByDate[d].fraud / fraudByDate[d].pax * 100) : 0,
  }));

  const lastTableY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ── Footer ────────────────────────────────────────────────────────────────
  const addFooter = () => {
    fillRect(doc, 0, pageH - 12, pageW, 12, C.navy);
    fillRect(doc, 0, pageH - 12, pageW, 0.8, C.gold);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.gray400);
    doc.text('SNCF Contrôles — Document confidentiel', 14, pageH - 5);
    doc.text(`Page ${pageNumber}`, pageW - 14, pageH - 5, { align: 'right' });
    doc.text(format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr }), pageW / 2, pageH - 5, { align: 'center' });
  };

  const newPage = () => { addFooter(); doc.addPage(); pageNumber++; y = 16; };

  // ── HEADER ────────────────────────────────────────────────────────────────
  fillRect(doc, 0, 0, pageW, 38, C.navy);
  fillRect(doc, 0, 38, pageW, 1.5, C.gold);
  fillRect(doc, pageW - 40, 0, 40, 38, C.navyMid);
  fillRect(doc, pageW - 42, 0, 2, 38, C.gold);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...C.white);
  doc.text('SNCF CONTRÔLES', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C.goldLight);
  doc.text('Rapport de contrôle ferroviaire', 14, 23);

  doc.setFontSize(8);
  doc.setTextColor(...C.gray400);
  doc.text(title, 14, 30);
  doc.text(`Période : ${dateRange}  |  Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, 14, 35.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.gold);
  doc.text(`${controls.length}`, pageW - 20, 18, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(...C.gray400);
  doc.setFont('helvetica', 'normal');
  doc.text('CONTRÔLES', pageW - 20, 23, { align: 'center' });

  if (includeStats) {

    // ── 1. VUE D'ENSEMBLE — 8 cartes KPI (même disposition que HTML) ─────
    y = sectionBar(doc, "Vue d'ensemble", 0, y, pageW, C.navy);

    const kpiItems = [
      { label: 'Voyageurs',      value: stats.totalPassengers.toString(),        sub: `${stats.passengersInRule} en règle`,          accent: C.navyLight },
      { label: 'Taux de fraude', value: formatFraudRate(stats.fraudRate),        sub: `${stats.fraudCount} infraction${stats.fraudCount > 1 ? 's' : ''}`, accent: C.red    },
      { label: 'Tarifs contrôle',value: stats.tarifsControle.toString(),         sub: `${totalTarifsAmt.toFixed(0)} €`,              accent: C.green     },
      { label: 'PV',             value: stats.pv.toString(),                     sub: `${totalPVAmt.toFixed(0)} €`,                  accent: C.red       },
      { label: 'Trains',         value: uniqueTrains.toString(),                 sub: `+ ${stats.byLocationType.gare.length} gare(s)`, accent: C.blue    },
      { label: 'Total encaissé', value: `${totalTarifsAmt.toFixed(0)} €`,       sub: 'hors PV',                                     accent: C.gold      },
      { label: 'RI',             value: `${stats.riPositive}+/${stats.riNegative}−`, sub: `${stats.riPositive + stats.riNegative} total`, accent: C.purple },
      { label: 'Tarifs bord',    value: stats.totalTarifsBord.toString(),        sub: 'ventes',                                      accent: C.teal      },
    ];

    const cardW = (pageW - 28 - 7 * 3) / 8;
    const cardH = 22;
    kpiItems.forEach((card, i) => {
      kpiCard(doc, 14 + i * (cardW + 3), y, cardW, cardH, card.label, card.value, card.sub, card.accent);
    });
    y += cardH + 8;

    // ── 2. ÉVOLUTION DU TAUX DE FRAUDE — graphique barres (même que HTML) ─
    if (chartData.length > 1) {
      if (y + 58 > safeH) newPage();
      y = sectionBar(doc, 'Évolution du taux de fraude', 0, y, pageW, C.navyMid);

      const barAreaH  = 34;
      const labelsH   = 9;
      const chartLeft = 14;
      const chartW    = pageW - 28;
      const maxBars   = Math.min(chartData.length, 50);
      const singleBarW = Math.max((chartW - (maxBars - 1) * 1.5) / maxBars, 3);
      const gap        = Math.max((chartW - singleBarW * maxBars) / Math.max(maxBars - 1, 1), 1.5);
      const maxRate    = Math.max(...chartData.slice(0, maxBars).map(d => d.rate), 1);

      // Fond
      fillRect(doc, chartLeft - 2, y - 2, chartW + 4, barAreaH + labelsH + 6, C.gray50);
      fillRect(doc, chartLeft - 2, y + barAreaH, chartW + 4, 0.5, C.gray200);

      chartData.slice(0, maxBars).forEach((d, i) => {
        const barH  = Math.max((d.rate / maxRate) * barAreaH, 1.5);
        const bx    = chartLeft + i * (singleBarW + gap);
        const by    = y + barAreaH - barH;
        const color = d.rate > 10 ? C.red : d.rate > 5 ? C.amber : C.green;

        fillRect(doc, bx, by, singleBarW, barH, color);

        if (barH > 5 && singleBarW >= 5) {
          doc.setFontSize(4.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...C.gray800);
          doc.text(d.rate.toFixed(1) + '%', bx + singleBarW / 2, by - 0.8, { align: 'center' });
          doc.setFont('helvetica', 'normal');
        }
        if (singleBarW >= 4) {
          doc.setFontSize(4.5);
          doc.setTextColor(...C.gray600);
          doc.text(d.date, bx + singleBarW / 2, y + barAreaH + labelsH - 1, { align: 'center' });
        }
      });

      // Légende
      [
        { label: '< 5% — Faible',   color: C.green },
        { label: '5–10% — Modéré',  color: C.amber },
        { label: '> 10% — Élevé',   color: C.red   },
      ].forEach((item, i) => {
        const lx = pageW - 95 + i * 32;
        const ly = y + barAreaH + labelsH + 3;
        fillRect(doc, lx, ly - 2.5, 5, 3, item.color);
        doc.setFontSize(5.5);
        doc.setTextColor(...C.gray600);
        doc.text(item.label, lx + 6.5, ly);
      });

      y += barAreaH + labelsH + 12;
    }

    // ── 3. TRAINS LES PLUS SENSIBLES (même que HTML) ──────────────────────
    const maxSensitive = Math.min(trainFraudStats.length, 10);
    if (maxSensitive > 0) {
      const rowH    = 10;
      const numRows = Math.ceil(maxSensitive / 2);
      if (y + 9 + numRows * rowH + 8 > safeH) newPage();
      y = sectionBar(doc, 'Trains les plus sensibles', 0, y, pageW, C.navyMid);

      const colW = (pageW - 28 - 8) / 2;
      trainFraudStats.slice(0, maxSensitive).forEach((t, i) => {
        const col     = i % 2;
        const row     = Math.floor(i / 2);
        const cx      = 14 + col * (colW + 8);
        const cy      = y + row * rowH;
        const color   = t.rate > 10 ? C.red   : t.rate > 5 ? C.amber : C.green;
        const bgColor = t.rate > 10 ? C.redLight : t.rate > 5 ? C.amberLight : C.greenLight;

        fillRect(doc, cx, cy, colW, rowH - 1.5, bgColor);
        fillRect(doc, cx, cy, 3.5, rowH - 1.5, color);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.gray800);
        doc.text(t.train, cx + 6, cy + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(...C.gray600);
        doc.text(`${t.passengers} voy. · ${t.controlCount} ctrl.`, cx + 6, cy + 7.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...color);
        doc.text(t.rate.toFixed(1) + '%', cx + colW - 2, cy + 5, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(...C.gray600);
        doc.text(`${t.fraudCount} fraud.`, cx + colW - 2, cy + 8, { align: 'right' });
      });

      y += numRows * rowH + 8;
    }

    // ── 4. DÉTAIL DES OPÉRATIONS — 4 blocs (même que HTML) ───────────────
    if (y + 80 > safeH) newPage();

    const halfW = (pageW - 28 - 8) / 2;

    // Ligne 1 : Tarifs contrôle (vert) | PV (rouge)
    const opsStartY = y;
    y = sectionBar(doc, 'Tarifs Contrôle — Régularisations', 14, opsStartY, halfW, C.green);
    autoTable(doc, {
      startY: y,
      head: [['Type', 'Nbre', 'Montant (€)']],
      body: [
        ['STT 50€',      stats.stt50.toString(),                              stats.totalAmounts.stt50.toFixed(2)],
        ['RNV',          stats.rnv.toString(),                                stats.totalAmounts.rnv.toFixed(2)],
        ['Titre tiers',  stats.tarifsControleDetails.titreTiers.toString(),   stats.totalAmounts.titreTiers.toFixed(2)],
        ['Date naiss.',  stats.tarifsControleDetails.docNaissance.toString(), stats.totalAmounts.docNaissance.toFixed(2)],
        ['Autre tarif',  stats.tarifsControleDetails.autre.toString(),        stats.totalAmounts.autre.toFixed(2)],
        ['TOTAL',        stats.tarifsControle.toString(),                     totalTarifsAmt.toFixed(2)],
      ],
      theme: 'plain',
      headStyles: { fillColor: C.greenLight, textColor: C.green, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2.5 },
      bodyStyles:  { fontSize: 7.5, cellPadding: 2.5, textColor: C.gray800 },
      alternateRowStyles: { fillColor: C.gray50 },
      didParseCell: (data) => {
        if (data.row.index === 5) {
          data.cell.styles.fillColor = C.green as unknown as string;
          data.cell.styles.textColor = C.white as unknown as string;
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14, right: pageW - 14 - halfW },
      tableWidth: halfW,
    });
    const leftFinalY = lastTableY();

    const pvBarY = sectionBar(doc, 'Procès-verbaux (PV)', 14 + halfW + 8, opsStartY, halfW, C.red);
    autoTable(doc, {
      startY: pvBarY,
      head: [['Type', 'Nbre', 'Montant (€)']],
      body: [
        ['STT 100€',    stats.stt100.toString(),                    stats.totalAmounts.stt100.toFixed(2)],
        ['STT100',      stats.pvBreakdown.stt100.toString(),        stats.totalAmounts.pvStt100.toFixed(2)],
        ['RNV',         stats.pvBreakdown.rnv.toString(),           stats.totalAmounts.pvRnv.toFixed(2)],
        ['Titre tiers', stats.pvBreakdown.titreTiers.toString(),    stats.totalAmounts.pvTitreTiers.toFixed(2)],
        ['D. naissance',stats.pvBreakdown.docNaissance.toString(),  stats.totalAmounts.pvDocNaissance.toFixed(2)],
        ['Autre',       stats.pvBreakdown.autre.toString(),         stats.totalAmounts.pvAutre.toFixed(2)],
        ['TOTAL',       stats.pv.toString(),                        totalPVAmt.toFixed(2)],
      ],
      theme: 'plain',
      headStyles: { fillColor: C.redLight, textColor: C.red, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2.5 },
      bodyStyles:  { fontSize: 7.5, cellPadding: 2.5, textColor: C.gray800 },
      alternateRowStyles: { fillColor: C.gray50 },
      didParseCell: (data) => {
        if (data.row.index === 6) {
          data.cell.styles.fillColor = C.red as unknown as string;
          data.cell.styles.textColor = C.white as unknown as string;
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14 + halfW + 8, right: 14 },
      tableWidth: halfW,
    });
    y = Math.max(leftFinalY, lastTableY()) + 6;

    // Ligne 2 : Tarifs bord (bleu) | RI (violet) | Répartition (teal)
    if (y + 50 > safeH) newPage();
    const thirdW    = (pageW - 28 - 16) / 3;
    const row2StartY = y;

    const bordBarY = sectionBar(doc, 'Tarifs à bord — Ventes', 14, row2StartY, thirdW, C.blue);
    autoTable(doc, {
      startY: bordBarY,
      head: [['Type', 'Nbre']],
      body: [
        ['STT 50€',     stats.tarifsBord.stt50.toString()],
        ['STT 100€',    stats.tarifsBord.stt100.toString()],
        ['RNV',         stats.tarifsBord.rnv.toString()],
        ['Titre tiers', stats.tarifsBord.titreTiers.toString()],
        ['Date naiss.', stats.tarifsBord.docNaissance.toString()],
        ['Autre',       stats.tarifsBord.autre.toString()],
        ['TOTAL',       stats.totalTarifsBord.toString()],
      ],
      theme: 'plain',
      headStyles: { fillColor: C.blueLight, textColor: C.blue, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2.5 },
      bodyStyles:  { fontSize: 7.5, cellPadding: 2.5, textColor: C.gray800 },
      alternateRowStyles: { fillColor: C.gray50 },
      didParseCell: (data) => {
        if (data.row.index === 6) {
          data.cell.styles.fillColor = C.blue as unknown as string;
          data.cell.styles.textColor = C.white as unknown as string;
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14, right: pageW - 14 - thirdW },
      tableWidth: thirdW,
    });

    const riBarY = sectionBar(doc, "Relevés d'identité (RI)", 14 + thirdW + 8, row2StartY, thirdW, C.purple);
    autoTable(doc, {
      startY: riBarY,
      head: [['Type', 'Nbre']],
      body: [
        ['RI Positif', stats.riPositive.toString()],
        ['RI Négatif', stats.riNegative.toString()],
        ['TOTAL',       (stats.riPositive + stats.riNegative).toString()],
      ],
      theme: 'plain',
      headStyles: { fillColor: C.purpleLight, textColor: C.purple, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2.5 },
      bodyStyles:  { fontSize: 7.5, cellPadding: 2.5, textColor: C.gray800 },
      alternateRowStyles: { fillColor: C.gray50 },
      didParseCell: (data) => {
        if (data.row.index === 2) {
          data.cell.styles.fillColor = C.purple as unknown as string;
          data.cell.styles.textColor = C.white as unknown as string;
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14 + thirdW + 8, right: pageW - 14 - 2 * (thirdW + 8) },
      tableWidth: thirdW,
    });

    const typeBarY = sectionBar(doc, 'Répartition par type', 14 + 2 * (thirdW + 8), row2StartY, thirdW, C.teal);
    autoTable(doc, {
      startY: typeBarY,
      head: [['Type', 'Contrôles']],
      body: [
        ['Trains', stats.byLocationType.train.length.toString()],
        ['Gares',  stats.byLocationType.gare.length.toString()],
        ['Quais',  stats.byLocationType.quai.length.toString()],
        ['TOTAL',  controls.length.toString()],
      ],
      theme: 'plain',
      headStyles: { fillColor: C.tealLight, textColor: C.teal, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2.5 },
      bodyStyles:  { fontSize: 7.5, cellPadding: 2.5, textColor: C.gray800 },
      alternateRowStyles: { fillColor: C.gray50 },
      didParseCell: (data) => {
        if (data.row.index === 3) {
          data.cell.styles.fillColor = C.teal as unknown as string;
          data.cell.styles.textColor = C.white as unknown as string;
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14 + 2 * (thirdW + 8), right: 14 },
      tableWidth: thirdW,
    });
    y = lastTableY() + 10;
  }

  // ── 5. DÉTAIL DES CONTRÔLES — 16 colonnes (même que HTML) ────────────────
  if (y + 30 > safeH) newPage();
  y = sectionBar(doc, `Détail des contrôles (${controls.length})`, 0, y, pageW, C.navy);

  const tableData = controls.map(control => {
    const d        = getControlDetails(control);
    const typeLabel = control.location_type === 'train' ? 'Train' : control.location_type === 'gare' ? 'Gare' : 'Quai';
    const numLieu   = control.location_type === 'train' ? d.trainNumber : d.location;
    const trajet    = control.location_type === 'train' ? `${d.origin} → ${d.destination}` : '—';
    const tarifBord = d.tarifBordStt50 + d.tarifBordStt100 + d.tarifBordRnv
      + d.tarifBordTitreTiers + d.tarifBordDocNaissance + d.tarifBordAutre;
    const ri = (d.riPositive || d.riNegative) ? `${d.riPositive}/${d.riNegative}` : '—';
    return [
      d.date, d.time, typeLabel, numLieu, trajet,
      d.passengers.toString(), d.inRule.toString(),
      d.stt50     || '—',
      d.stt100    || '—',
      d.rnv       || '—',
      d.pv        || '—',
      d.titreTiers   || '—',
      d.docNaissance || '—',
      ri,
      tarifBord   || '—',
      d.fraudRateFormatted,
      d.fraudRate,   // index 16 — couleur uniquement
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Heure', 'Type', 'N° / Lieu', 'Trajet', 'Voy.', 'OK',
            'STT 50€', 'STT 100€', 'RNV', 'PV', 'T.Tiers', 'D.Naiss.', 'RI +/−', 'T.Bord', 'Fraude']],
    body: tableData.map(r => r.slice(0, 16)),
    theme: 'plain',
    headStyles: {
      fillColor: C.navyMid,
      textColor: C.white,
      fontSize: 6.5,
      cellPadding: 2,
      halign: 'center',
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 6, cellPadding: 2, textColor: C.gray800 },
    alternateRowStyles: { fillColor: C.gray50 },
    didParseCell: (data) => {
      if (data.section === 'head') {
        data.cell.styles.lineWidth = { bottom: 0.5 } as unknown as number;
        data.cell.styles.lineColor = C.gold as unknown as string;
      }
      if (data.section === 'body') {
        const rate = tableData[data.row.index]?.[16] as number ?? 0;
        // Colonne Fraude (15)
        if (data.column.index === 15) {
          if (rate > 10) {
            data.cell.styles.textColor = C.red as unknown as string;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = C.redLight as unknown as string;
          } else if (rate > 5) {
            data.cell.styles.textColor = C.amber as unknown as string;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = C.amberLight as unknown as string;
          } else {
            data.cell.styles.textColor = C.green as unknown as string;
          }
        }
        // Colonne PV (10)
        if (data.column.index === 10) {
          const v = data.cell.text[0];
          if (v && v !== '—' && v !== '0') {
            data.cell.styles.textColor = C.red as unknown as string;
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // Colonnes STT (7, 8)
        if (data.column.index === 7 || data.column.index === 8) {
          const v = data.cell.text[0];
          if (v && v !== '—' && v !== '0') {
            data.cell.styles.textColor = C.green as unknown as string;
          }
        }
      }
    },
    columnStyles: {
      0:  { cellWidth: 14, halign: 'center' },  // Date
      1:  { cellWidth: 9,  halign: 'center' },  // Heure
      2:  { cellWidth: 10, halign: 'center' },  // Type
      3:  { cellWidth: 21 },                     // N°/Lieu
      4:  { cellWidth: 33 },                     // Trajet
      5:  { cellWidth: 8,  halign: 'center' },  // Voy.
      6:  { cellWidth: 7,  halign: 'center' },  // OK
      7:  { cellWidth: 11, halign: 'center' },  // STT50
      8:  { cellWidth: 12, halign: 'center' },  // STT100
      9:  { cellWidth: 8,  halign: 'center' },  // RNV
      10: { cellWidth: 8,  halign: 'center' },  // PV
      11: { cellWidth: 10, halign: 'center' },  // T.Tiers
      12: { cellWidth: 10, halign: 'center' },  // D.Naiss.
      13: { cellWidth: 10, halign: 'center' },  // RI
      14: { cellWidth: 10, halign: 'center' },  // T.Bord
      15: { cellWidth: 13, halign: 'center' },  // Fraude
    },
    margin: { left: 10, right: 10 },
    tableWidth: 'auto',
    didDrawPage: () => { addFooter(); pageNumber++; },
  });

  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
export function generatePDFPreview(options: ExportOptions): string {
  const doc = exportToPDF(options);
  const pdfBlob = doc.output('blob');
  return URL.createObjectURL(pdfBlob);
}

export function downloadPDF(doc: jsPDF, filename?: string) {
  const finalFilename = filename || `controles-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  try {
    doc.save(finalFilename);
  } catch (error) {
    console.error('PDF save error:', error);
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  exportTableToPDF  (premium theme)
// ─────────────────────────────────────────────────────────────────────────────
export interface TableExportOptions {
  controls: Control[];
  title: string;
  dateRange: string;
}

export function exportTableToPDF({ controls, title, dateRange }: TableExportOptions) {
  if (!controls || controls.length === 0) throw new Error('Aucun contrôle à exporter');

  try {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let currentPage = 1;

    const addPageFooter = () => {
      fillRect(doc, 0, pageH - 11, pageW, 11, C.navy);
      fillRect(doc, 0, pageH - 11, pageW, 0.8, C.gold);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.gray400);
      doc.text('SNCF Contrôles — Document confidentiel', 10, pageH - 4);
      doc.text(`Page ${currentPage}`, pageW - 10, pageH - 4, { align: 'right' });
      doc.text(format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr }), pageW / 2, pageH - 4, { align: 'center' });
    };

    // Header banner
    fillRect(doc, 0, 0, pageW, 26, C.navy);
    fillRect(doc, 0, 26, pageW, 1.2, C.gold);
    fillRect(doc, pageW - 30, 0, 30, 26, C.navyMid);
    fillRect(doc, pageW - 31.5, 0, 1.5, 26, C.gold);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...C.white);
    doc.text('SNCF CONTRÔLES', 10, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.goldLight);
    doc.text('Tableau de bord complet', 10, 18);

    doc.setFontSize(7);
    doc.setTextColor(...C.gray400);
    doc.text(`${title}  |  ${dateRange}  |  ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}`, 10, 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...C.gold);
    doc.text(`${controls.length}`, pageW - 15, 13, { align: 'center' });
    doc.setFontSize(6);
    doc.setTextColor(...C.gray400);
    doc.setFont('helvetica', 'normal');
    doc.text('CONTRÔLES', pageW - 15, 18, { align: 'center' });

    const tableData = controls.map(control => {
      const fraudCount = control.tarifs_controle + control.pv + control.ri_negative;
      const fraudRate = control.nb_passagers > 0
        ? ((fraudCount / control.nb_passagers) * 100).toFixed(1) + '%'
        : '0.0%';
      const fraudRateNum = control.nb_passagers > 0
        ? (fraudCount / control.nb_passagers) * 100
        : 0;
      const locationInfo = control.location_type === 'train'
        ? `T. ${control.train_number || '-'}`
        : control.location_type === 'gare' ? 'Gare' : 'Quai';
      const trajet = control.origin && control.destination
        ? `${control.origin} → ${control.destination}`
        : control.location;
      const tarifBordTotal = (control.tarif_bord_stt_50 || 0)
        + (control.tarif_bord_stt_100 || 0)
        + (control.tarif_bord_rnv || 0)
        + (control.tarif_bord_titre_tiers || 0)
        + (control.tarif_bord_doc_naissance || 0)
        + (control.tarif_bord_autre || 0);

      return [
        format(new Date(control.control_date), 'dd/MM/yy', { locale: fr }),
        control.control_time.slice(0, 5),
        locationInfo,
        trajet,
        control.nb_passagers.toString(),
        control.nb_en_regle.toString(),
        tarifBordTotal.toString(),
        control.tarifs_controle.toString(),
        (control.titre_tiers || 0).toString(),
        (control.doc_naissance || 0).toString(),
        control.pv.toString(),
        control.stt_50.toString(),
        control.stt_100.toString(),
        control.rnv.toString(),
        control.ri_positive.toString(),
        control.ri_negative.toString(),
        fraudRate,
        fraudRateNum,  // index 17 – for coloring
      ];
    });

    autoTable(doc, {
      startY: 31,
      head: [['Date','Heure','Type','Trajet','V.','OK','Bord','TC','Ti','Na','PV','S50','S100','RNV','R+','R−','%']],
      body: tableData.map(r => r.slice(0, 17)),
      theme: 'plain',
      headStyles: {
        fillColor: C.navyMid,
        textColor: C.white,
        fontSize: 6.5,
        cellPadding: 2,
        halign: 'center',
        fontStyle: 'bold',
        lineWidth: { bottom: 0.5 } as unknown as number,
        lineColor: C.gold as unknown as string,
      },
      bodyStyles: { fontSize: 6, cellPadding: 1.8, textColor: C.gray800 },
      alternateRowStyles: { fillColor: C.gray50 },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const rate = tableData[data.row.index]?.[17] as number ?? 0;
          // Fraud rate column (index 16)
          if (data.column.index === 16) {
            if (rate > 10) {
              data.cell.styles.textColor = C.red as unknown as string;
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = C.redLight as unknown as string;
            } else if (rate > 5) {
              data.cell.styles.textColor = C.amber as unknown as string;
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = C.amberLight as unknown as string;
            } else {
              data.cell.styles.textColor = C.green as unknown as string;
            }
          }
          // PV column (index 10)
          if (data.column.index === 10 && data.cell.text[0] !== '0') {
            data.cell.styles.textColor = C.red as unknown as string;
            data.cell.styles.fontStyle = 'bold';
          }
          // TC column (index 7)
          if (data.column.index === 7 && data.cell.text[0] !== '0') {
            data.cell.styles.textColor = C.green as unknown as string;
          }
        }
      },
      columnStyles: {
        0:  { cellWidth: 14 },
        1:  { cellWidth: 10 },
        2:  { cellWidth: 14 },
        3:  { cellWidth: 38 },
        4:  { cellWidth: 8,  halign: 'center' },
        5:  { cellWidth: 8,  halign: 'center' },
        6:  { cellWidth: 8,  halign: 'center' },
        7:  { cellWidth: 8,  halign: 'center' },
        8:  { cellWidth: 8,  halign: 'center' },
        9:  { cellWidth: 8,  halign: 'center' },
        10: { cellWidth: 8,  halign: 'center' },
        11: { cellWidth: 10, halign: 'center' },
        12: { cellWidth: 12, halign: 'center' },
        13: { cellWidth: 10, halign: 'center' },
        14: { cellWidth: 8,  halign: 'center' },
        15: { cellWidth: 8,  halign: 'center' },
        16: { cellWidth: 13, halign: 'center' },
      },
      margin: { left: 8, right: 8 },
      tableWidth: 'auto',
      didDrawPage: () => {
        addPageFooter();
        currentPage++;
      },
    });

    const filename = `tableau-controles-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 1000);
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error('Erreur lors de la génération du PDF. Veuillez réessayer.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  exportToHTML  (premium theme)
// ─────────────────────────────────────────────────────────────────────────────
export function exportToHTML({ controls, title, dateRange, includeStats, exportMode = 'detailed' }: ExportOptions): string {
  const stats = calculateExtendedStats(controls);
  const isDetailed  = exportMode === 'detailed'   || exportMode === 'both';
  const isSimplified= exportMode === 'simplified' || exportMode === 'both';

  const trainGroups: Record<string, Control[]> = {};
  controls.forEach(c => {
    const key = c.train_number || c.location || 'Inconnu';
    if (!trainGroups[key]) trainGroups[key] = [];
    trainGroups[key].push(c);
  });
  const trainKeys = Object.keys(trainGroups).sort();
  const uniqueTrains = new Set(controls.filter(c => c.location_type === 'train').map(c => c.train_number)).size;

  const totalTarifsControle = stats.totalAmounts.stt50 + stats.totalAmounts.rnv
    + stats.totalAmounts.titreTiers + stats.totalAmounts.docNaissance + stats.totalAmounts.autre;
  const totalPV = stats.totalAmounts.stt100 + stats.totalAmounts.pvStt100
    + stats.totalAmounts.pvRnv + stats.totalAmounts.pvTitreTiers
    + stats.totalAmounts.pvDocNaissance + stats.totalAmounts.pvAutre;
  const totalEncaisse = totalTarifsControle;

  const trainFraudStats = trainKeys.map(key => {
    const group = trainGroups[key];
    const totalPax   = group.reduce((s, c) => s + c.nb_passagers, 0);
    const totalFraud = group.reduce((s, c) => s + c.tarifs_controle + c.pv + c.ri_negative, 0);
    const rate = totalPax > 0 ? (totalFraud / totalPax) * 100 : 0;
    return { train: key, passengers: totalPax, fraudCount: totalFraud, rate, controlCount: group.length };
  }).sort((a, b) => b.rate - a.rate);

  const fraudByDate: Record<string, { pax: number; fraud: number }> = {};
  controls.forEach(c => {
    const d = c.control_date;
    if (!fraudByDate[d]) fraudByDate[d] = { pax: 0, fraud: 0 };
    fraudByDate[d].pax   += c.nb_passagers;
    fraudByDate[d].fraud += c.tarifs_controle + c.pv + c.ri_negative;
  });
  const sortedDates = Object.keys(fraudByDate).sort();
  const chartData = sortedDates.map(d => ({
    date: format(new Date(d), 'dd/MM', { locale: fr }),
    rate: fraudByDate[d].pax > 0 ? (fraudByDate[d].fraud / fraudByDate[d].pax * 100) : 0,
  }));

  const detailRow = (label: string, count: number, amount?: number) => {
    if (count === 0 && (!amount || amount === 0)) return '';
    return amount !== undefined
      ? `<tr><td>${label}</td><td class="num"><span class="pill">${count}</span></td><td class="amount">${Number(amount).toFixed(2)} €</td></tr>`
      : `<tr><td>${label}</td><td class="num"><span class="pill">${count}</span></td></tr>`;
  };

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — SNCF Contrôles</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    /* ── Reset & base ─────────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --navy:        #0a1450;
      --navy-mid:    #142878;
      --navy-light:  #2850a0;
      --gold:        #d4af37;
      --gold-light:  #f0d060;
      --gold-pale:   #fdf6d8;
      --green:       #16a34a;
      --green-light: #dcfce7;
      --red:         #dc2626;
      --red-light:   #fee2e2;
      --amber:       #d97706;
      --amber-light: #fef3c7;
      --blue:        #2563eb;
      --blue-light:  #dbeafe;
      --purple:      #7c3aed;
      --purple-light:#ede9fe;
      --teal:        #0d9488;
      --teal-light:  #ccfbf1;
      --bg:          #f1f5fb;
      --surface:     #ffffff;
      --border:      #e2e8f0;
      --text:        #1e293b;
      --text-muted:  #64748b;
      --text-faint:  #94a3b8;
    }
    body {
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 14px;
      line-height: 1.6;
    }
    .container { max-width: 1440px; margin: 0 auto; padding: 20px; }

    /* ── Header ───────────────────────────────────────────────────── */
    .header {
      background: linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 60%, #1a3080 100%);
      color: white;
      padding: 36px 40px;
      border-radius: 16px;
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(10,20,80,0.35);
    }
    .header::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--gold), var(--gold-light), var(--gold));
    }
    .header::after {
      content: '';
      position: absolute;
      top: -60px; right: -60px;
      width: 200px; height: 200px;
      border-radius: 50%;
      background: rgba(212,175,55,0.08);
      pointer-events: none;
    }
    .header-inner { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 20px; }
    .header-title { font-size: 30px; font-weight: 800; letter-spacing: -0.5px; }
    .header-subtitle { color: var(--gold-light); font-size: 14px; font-weight: 500; margin-top: 4px; }
    .header-meta { color: rgba(255,255,255,0.65); font-size: 12px; margin-top: 10px; }
    .header-badge {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(212,175,55,0.4);
      border-radius: 12px;
      padding: 14px 22px;
      text-align: center;
      backdrop-filter: blur(8px);
    }
    .header-badge-num { font-size: 36px; font-weight: 800; color: var(--gold); line-height: 1; }
    .header-badge-lbl { font-size: 11px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }

    /* ── Cards ────────────────────────────────────────────────────── */
    .section {
      background: var(--surface);
      border-radius: 14px;
      padding: 0;
      margin-bottom: 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      border: 1px solid var(--border);
      overflow: hidden;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      cursor: pointer;
      border-bottom: 1px solid var(--border);
      background: #fafbfe;
      transition: background 0.15s;
    }
    .section-header:hover { background: #f1f5fb; }
    .section-header h2 {
      font-size: 15px;
      font-weight: 700;
      color: var(--navy);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-header h2 .icon { font-size: 18px; }
    .section-toggle {
      background: none;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 4px 12px;
      cursor: pointer;
      font-size: 11px;
      color: var(--text-muted);
      font-family: inherit;
      transition: all 0.15s;
    }
    .section-toggle:hover { background: var(--navy); color: white; border-color: var(--navy); }
    .section-body { padding: 24px; }
    .section-body.hidden { display: none; }

    /* ── KPI grid ─────────────────────────────────────────────────── */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; }
    .kpi-card {
      border-radius: 12px;
      padding: 18px 16px;
      text-align: center;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
    }
    .kpi-card.navy   { background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%); color: white; }
    .kpi-card.navy::before   { background: var(--gold); }
    .kpi-card.green  { background: var(--green-light); }
    .kpi-card.green::before  { background: var(--green); }
    .kpi-card.red    { background: var(--red-light); }
    .kpi-card.red::before    { background: var(--red); }
    .kpi-card.amber  { background: var(--amber-light); }
    .kpi-card.amber::before  { background: var(--amber); }
    .kpi-card.blue   { background: var(--blue-light); }
    .kpi-card.blue::before   { background: var(--blue); }
    .kpi-card.purple { background: var(--purple-light); }
    .kpi-card.purple::before { background: var(--purple); }
    .kpi-card.teal   { background: var(--teal-light); }
    .kpi-card.teal::before   { background: var(--teal); }
    .kpi-card.gold   { background: var(--gold-pale); }
    .kpi-card.gold::before   { background: var(--gold); }
    .kpi-value { font-size: 28px; font-weight: 800; line-height: 1.1; }
    .kpi-card.navy .kpi-value { color: white; }
    .kpi-card.green  .kpi-value { color: var(--green);  }
    .kpi-card.red    .kpi-value { color: var(--red);    }
    .kpi-card.amber  .kpi-value { color: var(--amber);  }
    .kpi-card.blue   .kpi-value { color: var(--blue);   }
    .kpi-card.purple .kpi-value { color: var(--purple); }
    .kpi-card.teal   .kpi-value { color: var(--teal);   }
    .kpi-card.gold   .kpi-value { color: #92701a;        }
    .kpi-sub { font-size: 11px; color: var(--text-muted); margin-top: 3px; }
    .kpi-card.navy .kpi-sub { color: rgba(255,255,255,0.65); }
    .kpi-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-faint); margin-top: 8px; }
    .kpi-card.navy .kpi-label { color: rgba(255,255,255,0.45); }

    /* ── Detail tables ────────────────────────────────────────────── */
    .ops-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
    .ops-block h3 {
      font-size: 13px;
      font-weight: 700;
      padding: 10px 14px;
      border-radius: 8px 8px 0 0;
      margin-bottom: 0;
    }
    .ops-block.green h3 { background: var(--green); color: white; }
    .ops-block.red   h3 { background: var(--red);   color: white; }
    .ops-block.blue  h3 { background: var(--blue);  color: white; }
    .ops-block.purple h3 { background: var(--purple); color: white; }
    .detail-table { width: 100%; border-collapse: collapse; border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 8px; overflow: hidden; }
    .detail-table th { background: #f8fafc; padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }
    .detail-table td { padding: 9px 12px; border-bottom: 1px solid var(--border); font-size: 13px; }
    .detail-table tr:last-child td { border-bottom: none; }
    .detail-table tr:hover td { background: var(--bg); }
    .detail-table .total td { background: var(--navy); color: white; font-weight: 700; border-radius: 0 0 8px 8px; }
    .pill { display: inline-block; background: var(--navy-mid); color: white; border-radius: 20px; padding: 1px 9px; font-size: 12px; font-weight: 600; }
    .amount { font-weight: 600; color: var(--navy); font-variant-numeric: tabular-nums; }
    td.num { text-align: center; }

    /* ── Chart ────────────────────────────────────────────────────── */
    .chart-wrap { overflow-x: auto; padding: 8px 0 4px; }
    .chart-bars { display: flex; align-items: flex-end; gap: 6px; height: 140px; min-width: max-content; padding: 0 8px; }
    .bar-col { display: flex; flex-direction: column; align-items: center; min-width: 36px; }
    .bar-val { font-size: 9px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .bar { width: 100%; border-radius: 6px 6px 0 0; min-height: 6px; transition: opacity 0.2s; cursor: default; }
    .bar:hover { opacity: 0.78; }
    .bar-lbl { font-size: 9px; color: var(--text-muted); margin-top: 5px; transform: rotate(-40deg); white-space: nowrap; transform-origin: top left; }
    .chart-legend { display: flex; gap: 16px; margin-top: 18px; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

    /* ── Sensitive trains ─────────────────────────────────────────── */
    .sensitive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .sensitive-card {
      border-radius: 10px;
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid var(--border);
      transition: transform 0.15s;
    }
    .sensitive-card:hover { transform: translateX(3px); }
    .sensitive-card.high   { border-left: 5px solid var(--red);   background: var(--red-light);   }
    .sensitive-card.medium { border-left: 5px solid var(--amber); background: var(--amber-light); }
    .sensitive-card.low    { border-left: 5px solid var(--green); background: var(--green-light); }
    .sensitive-name { font-weight: 700; font-size: 14px; }
    .sensitive-info { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .sensitive-rate { font-size: 22px; font-weight: 800; text-align: right; }
    .sensitive-card.high   .sensitive-rate { color: var(--red);   }
    .sensitive-card.medium .sensitive-rate { color: var(--amber); }
    .sensitive-card.low    .sensitive-rate { color: var(--green); }
    .sensitive-count { font-size: 10px; color: var(--text-muted); text-align: right; margin-top: 2px; }

    /* ── Train nav ────────────────────────────────────────────────── */
    .train-nav { display: flex; flex-wrap: wrap; gap: 8px; }
    .train-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 14px; background: var(--navy); color: white;
      border-radius: 20px; text-decoration: none; font-size: 12px; font-weight: 600;
      transition: all 0.15s;
    }
    .train-chip:hover { background: var(--gold); color: var(--navy); transform: translateY(-1px); }
    .train-chip .count {
      background: rgba(255,255,255,0.2);
      border-radius: 10px; padding: 1px 7px; font-size: 10px;
    }
    .train-chip:hover .count { background: rgba(10,20,80,0.2); }

    /* ── Controls table ───────────────────────────────────────────── */
    .table-wrap { overflow-x: auto; border-radius: 0 0 12px 12px; }
    .controls-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .controls-table thead th {
      background: var(--navy);
      color: white;
      padding: 11px 10px;
      text-align: left;
      position: sticky;
      top: 0;
      cursor: pointer;
      user-select: none;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      border-bottom: 2px solid var(--gold);
      transition: background 0.15s;
    }
    .controls-table thead th:hover { background: var(--navy-light); }
    .controls-table thead th::after { content: ' ↕'; opacity: 0.4; font-size: 9px; }
    .controls-table tbody td { padding: 9px 10px; border-bottom: 1px solid var(--border); }
    .controls-table tbody tr:hover td { background: #f0f4ff; }
    .controls-table tbody tr:nth-child(even) td { background: #fafbfe; }
    .controls-table tbody tr:nth-child(even):hover td { background: #ecf0ff; }
    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; font-size: 10px; font-weight: 600; white-space: nowrap; }
    .badge-train  { background: var(--blue-light);   color: var(--blue);   }
    .badge-gare   { background: var(--amber-light);  color: #92400e;       }
    .badge-quai   { background: var(--green-light);  color: #065f46;       }
    .fraud-high   { color: var(--red);   font-weight: 700; background: var(--red-light);   padding: 2px 7px; border-radius: 4px; display: inline-block; }
    .fraud-medium { color: var(--amber); font-weight: 600; background: var(--amber-light); padding: 2px 7px; border-radius: 4px; display: inline-block; }
    .fraud-low    { color: var(--green); font-weight: 500; }
    .pv-cell { color: var(--red); font-weight: 700; }
    .col-num { text-align: center; }

    /* ── Column toggles ───────────────────────────────────────────── */
    .toggles {
      display: flex; flex-wrap: wrap; gap: 6px; padding: 14px 0 6px;
      border-bottom: 1px solid var(--border); margin-bottom: 16px;
    }
    .toggle-btn {
      padding: 4px 13px; border: 1.5px solid var(--border);
      border-radius: 20px; background: white; cursor: pointer;
      font-size: 11px; font-weight: 500; color: var(--text-muted);
      font-family: inherit; transition: all 0.15s;
    }
    .toggle-btn.active { background: var(--navy); color: white; border-color: var(--navy); }
    .toggle-btn:hover:not(.active) { border-color: var(--navy); color: var(--navy); }

    /* ── Print button ─────────────────────────────────────────────── */
    .fab {
      position: fixed; bottom: 28px; right: 28px;
      background: linear-gradient(135deg, var(--navy), var(--navy-light));
      color: white; border: none; padding: 14px 24px;
      border-radius: 40px; font-size: 14px; font-weight: 600;
      cursor: pointer; box-shadow: 0 6px 24px rgba(10,20,80,0.4);
      font-family: inherit; z-index: 100;
      display: flex; align-items: center; gap: 8px;
      transition: all 0.2s;
    }
    .fab::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--gold); border-radius: 40px 40px 0 0; }
    .fab:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(10,20,80,0.5); }

    /* ── Synthèse table ───────────────────────────────────────────── */
    .synth-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .synth-table th { background: var(--navy); color: white; padding: 10px 14px; font-size: 12px; text-align: left; }
    .synth-table th:first-child { border-radius: 8px 0 0 0; }
    .synth-table th:last-child  { border-radius: 0 8px 0 0; }
    .synth-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }
    .synth-table tr:last-child td { border-bottom: none; }
    .synth-table tr:hover td { background: var(--bg); }
    .amount-badge {
      background: var(--gold-pale); color: #7a5c00;
      border: 1px solid #e8c84a; border-radius: 6px;
      padding: 2px 8px; font-weight: 700; font-size: 12px;
    }

    /* ── Footer ───────────────────────────────────────────────────── */
    .page-footer {
      text-align: center; padding: 28px 20px;
      color: var(--text-faint); font-size: 12px;
      border-top: 1px solid var(--border); margin-top: 8px;
    }
    .page-footer strong { color: var(--navy); }

    /* ── Print ────────────────────────────────────────────────────── */
    @media print {
      body { background: white; font-size: 11px; }
      .container { padding: 0; }
      .header { border-radius: 0; box-shadow: none; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section { box-shadow: none; page-break-inside: avoid; }
      .fab, .toggles, .section-toggle { display: none !important; }
      .controls-table thead th { background: var(--navy) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .kpi-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    @media (max-width: 600px) {
      .header-inner { flex-direction: column; }
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>

<button class="fab" onclick="window.print()">🖨️ Imprimer / PDF</button>

<div class="container">

  <!-- ── HEADER ── -->
  <div class="header">
    <div class="header-inner">
      <div>
        <div class="header-title">🚂 SNCF Contrôles</div>
        <div class="header-subtitle">${exportMode === 'simplified' ? 'Rapport Simplifié' : exportMode === 'both' ? 'Rapport Complet' : 'Rapport Détaillé'}</div>
        <div class="header-meta">
          <strong style="color:var(--gold-light)">${title}</strong><br>
          Période : ${dateRange}<br>
          Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })} &nbsp;·&nbsp;
          ${controls.length} contrôle${controls.length > 1 ? 's' : ''} &nbsp;·&nbsp;
          ${uniqueTrains} train${uniqueTrains > 1 ? 's' : ''} contrôlé${uniqueTrains > 1 ? 's' : ''}
        </div>
      </div>
      <div class="header-badge">
        <div class="header-badge-num">${controls.length}</div>
        <div class="header-badge-lbl">Contrôles</div>
      </div>
    </div>
  </div>

  <!-- ── TRAIN NAV ── -->
  ${trainKeys.length > 1 ? `
  <div class="section">
    <div class="section-header" onclick="toggleSection('trains-nav')">
      <h2><span class="icon">🚆</span> Trains dans cet export (${trainKeys.length})</h2>
      <button class="section-toggle">Masquer</button>
    </div>
    <div class="section-body" id="trains-nav">
      <div class="train-nav">
        ${trainKeys.map(key => `
          <a href="#train-${key.replace(/\s/g, '-')}" class="train-chip">
            ${key}<span class="count">${trainGroups[key].length}</span>
          </a>`).join('')}
      </div>
    </div>
  </div>
  ` : ''}

  ${includeStats ? `

  <!-- ── KPI OVERVIEW ── -->
  <div class="section">
    <div class="section-header" onclick="toggleSection('overview')">
      <h2><span class="icon">📊</span> Vue d'ensemble</h2>
      <button class="section-toggle">Masquer</button>
    </div>
    <div class="section-body" id="overview">
      <div class="kpi-grid">
        <div class="kpi-card navy">
          <div class="kpi-value">${stats.totalPassengers}</div>
          <div class="kpi-sub">${stats.passengersInRule} en règle</div>
          <div class="kpi-label">Voyageurs contrôlés</div>
        </div>
        <div class="kpi-card red">
          <div class="kpi-value">${formatFraudRate(stats.fraudRate)}</div>
          <div class="kpi-sub">${stats.fraudCount} infraction${stats.fraudCount > 1 ? 's' : ''}</div>
          <div class="kpi-label">Taux de fraude</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-value">${stats.tarifsControle}</div>
          <div class="kpi-sub">${totalTarifsControle.toFixed(0)} €</div>
          <div class="kpi-label">Tarifs contrôle</div>
        </div>
        <div class="kpi-card red">
          <div class="kpi-value">${stats.pv}</div>
          <div class="kpi-sub">${totalPV.toFixed(0)} €</div>
          <div class="kpi-label">Procès-verbaux</div>
        </div>
        <div class="kpi-card blue">
          <div class="kpi-value">${uniqueTrains}</div>
          <div class="kpi-sub">+ ${stats.byLocationType.gare.length} gare(s)</div>
          <div class="kpi-label">Trains contrôlés</div>
        </div>
        <div class="kpi-card gold">
          <div class="kpi-value">${totalEncaisse.toFixed(0)} €</div>
          <div class="kpi-sub">hors PV</div>
          <div class="kpi-label">Total encaissé</div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-value">${stats.riPositive}+ / ${stats.riNegative}−</div>
          <div class="kpi-sub">${stats.riPositive + stats.riNegative} total</div>
          <div class="kpi-label">Relevés d'identité</div>
        </div>
        <div class="kpi-card teal">
          <div class="kpi-value">${stats.totalTarifsBord}</div>
          <div class="kpi-sub">ventes à bord</div>
          <div class="kpi-label">Tarifs bord</div>
        </div>
      </div>
    </div>
  </div>

  ${chartData.length > 1 ? `
  <!-- ── FRAUD CHART ── -->
  <div class="section">
    <div class="section-header" onclick="toggleSection('fraud-chart')">
      <h2><span class="icon">📈</span> Évolution du taux de fraude</h2>
      <button class="section-toggle">Masquer</button>
    </div>
    <div class="section-body" id="fraud-chart">
      <div class="chart-wrap">
        <div class="chart-bars">
          ${(() => {
            const maxRate = Math.max(...chartData.map(x => x.rate), 1);
            return chartData.map(d => {
              const height = Math.max((d.rate / maxRate) * 110, 6);
              const color = d.rate > 10 ? 'var(--red)' : d.rate > 5 ? 'var(--amber)' : 'var(--green)';
              return `<div class="bar-col">
                <div class="bar-val">${d.rate.toFixed(1)}%</div>
                <div class="bar" style="height:${height}px;background:${color}" title="${d.date} : ${d.rate.toFixed(2)}%"></div>
                <div class="bar-lbl">${d.date}</div>
              </div>`;
            }).join('');
          })()}
        </div>
      </div>
      <div class="chart-legend">
        <div class="legend-item"><div class="legend-dot" style="background:var(--green)"></div> &lt; 5% — Faible</div>
        <div class="legend-item"><div class="legend-dot" style="background:var(--amber)"></div> 5–10% — Modéré</div>
        <div class="legend-item"><div class="legend-dot" style="background:var(--red)"></div> &gt; 10% — Élevé</div>
      </div>
    </div>
  </div>
  ` : ''}

  ${trainFraudStats.length > 0 ? `
  <!-- ── SENSITIVE TRAINS ── -->
  <div class="section">
    <div class="section-header" onclick="toggleSection('sensitive-trains')">
      <h2><span class="icon">⚠️</span> Trains les plus sensibles</h2>
      <button class="section-toggle">Masquer</button>
    </div>
    <div class="section-body" id="sensitive-trains">
      <div class="sensitive-grid">
        ${trainFraudStats.slice(0, 12).map(t => {
          const cls = t.rate > 10 ? 'high' : t.rate > 5 ? 'medium' : 'low';
          return `<div class="sensitive-card ${cls}">
            <div>
              <div class="sensitive-name">${t.train}</div>
              <div class="sensitive-info">${t.passengers} voy. · ${t.controlCount} contrôle${t.controlCount > 1 ? 's' : ''}</div>
            </div>
            <div>
              <div class="sensitive-rate">${t.rate.toFixed(1)}%</div>
              <div class="sensitive-count">${t.fraudCount} fraud.</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>
  ` : ''}

  ${isDetailed ? `
  <!-- ── OPS DETAIL ── -->
  <div class="section">
    <div class="section-header" onclick="toggleSection('detail-ops')">
      <h2><span class="icon">💶</span> Détail des opérations</h2>
      <button class="section-toggle">Masquer</button>
    </div>
    <div class="section-body" id="detail-ops">
      <div class="ops-grid">
        <div class="ops-block green">
          <h3>Tarifs Contrôle — Régularisations</h3>
          <table class="detail-table">
            <tr><th>Type</th><th>Nbre</th><th>Montant</th></tr>
            ${detailRow('STT 50€',      stats.stt50, stats.totalAmounts.stt50)}
            ${detailRow('RNV',          stats.rnv,   stats.totalAmounts.rnv)}
            ${detailRow('Titre tiers',  stats.tarifsControleDetails.titreTiers,   stats.totalAmounts.titreTiers)}
            ${detailRow('Date naiss.',  stats.tarifsControleDetails.docNaissance, stats.totalAmounts.docNaissance)}
            ${detailRow('Autre tarif',  stats.tarifsControleDetails.autre,        stats.totalAmounts.autre)}
            <tr class="total"><td>TOTAL</td><td>${stats.tarifsControle}</td><td>${totalTarifsControle.toFixed(2)} €</td></tr>
          </table>
        </div>
        <div class="ops-block red">
          <h3>Procès-verbaux (PV)</h3>
          <table class="detail-table">
            <tr><th>Type</th><th>Nbre</th><th>Montant</th></tr>
            ${detailRow('STT 100€',       stats.stt100,              stats.totalAmounts.stt100)}
            ${detailRow('STT100',      stats.pvBreakdown.stt100,       stats.totalAmounts.pvStt100)}
            ${detailRow('RNV',         stats.pvBreakdown.rnv,          stats.totalAmounts.pvRnv)}
            ${detailRow('Titre tiers', stats.pvBreakdown.titreTiers,   stats.totalAmounts.pvTitreTiers)}
            ${detailRow('D. naissance',stats.pvBreakdown.docNaissance, stats.totalAmounts.pvDocNaissance)}
            ${detailRow('Autre',       stats.pvBreakdown.autre,        stats.totalAmounts.pvAutre)}
            <tr class="total"><td>TOTAL</td><td>${stats.pv}</td><td>${totalPV.toFixed(2)} €</td></tr>
          </table>
        </div>
        ${stats.totalTarifsBord > 0 ? `
        <div class="ops-block blue">
          <h3>Tarifs à bord / exceptionnel — Ventes</h3>
          <table class="detail-table">
            <tr><th>Type</th><th>Nbre</th><th>Montant</th></tr>
            ${detailRow('Tarif bord',         stats.tarifsBord.stt50,        stats.tarifsBord.stt50Amount)}
            ${detailRow('Tarif exceptionnel', stats.tarifsBord.stt100,       stats.tarifsBord.stt100Amount)}
            ${detailRow('RNV',               stats.tarifsBord.rnv,          stats.tarifsBord.rnvAmount)}
            ${detailRow('Titre tiers',        stats.tarifsBord.titreTiers,   stats.tarifsBord.titreTiersAmount)}
            ${detailRow('Date naiss.',        stats.tarifsBord.docNaissance, stats.tarifsBord.docNaissanceAmount)}
            ${detailRow('Autre',              stats.tarifsBord.autre,        stats.tarifsBord.autreAmount)}
            <tr class="total"><td>TOTAL</td><td>${stats.totalTarifsBord}</td><td>${stats.totalTarifsBordAmount.toFixed(2)} €</td></tr>
          </table>
        </div>
        ` : ''}
        ${(stats.riPositive + stats.riNegative) > 0 ? `
        <div class="ops-block purple">
          <h3>Relevés d'identité (RI)</h3>
          <table class="detail-table">
            <tr><th>Type</th><th>Nbre</th></tr>
            ${detailRow('RI Positif', stats.riPositive)}
            ${detailRow('RI Négatif', stats.riNegative)}
            <tr class="total"><td>TOTAL</td><td>${stats.riPositive + stats.riNegative}</td></tr>
          </table>
        </div>
        ` : ''}
      </div>
    </div>
  </div>
  ` : ''}

  ${isSimplified ? `
  <!-- ── SYNTHÈSE ── -->
  <div class="section">
    <div class="section-header" onclick="toggleSection('synthese')">
      <h2><span class="icon">📋</span> Synthèse</h2>
      <button class="section-toggle">Masquer</button>
    </div>
    <div class="section-body" id="synthese">
      <div class="kpi-grid">
        <div class="kpi-card navy">
          <div class="kpi-value">${controls.length}</div>
          <div class="kpi-label">Contrôles</div>
        </div>
        <div class="kpi-card navy">
          <div class="kpi-value">${stats.totalPassengers}</div>
          <div class="kpi-label">Voyageurs</div>
        </div>
        <div class="kpi-card red">
          <div class="kpi-value">${formatFraudRate(stats.fraudRate)}</div>
          <div class="kpi-sub">${stats.fraudCount} fraudeur${stats.fraudCount > 1 ? 's' : ''}</div>
          <div class="kpi-label">Taux de fraude</div>
        </div>
        <div class="kpi-card gold">
          <div class="kpi-value">${totalEncaisse.toFixed(0)} €</div>
          <div class="kpi-label">Total encaissé</div>
        </div>
        <div class="kpi-card red">
          <div class="kpi-value">${totalPV.toFixed(0)} €</div>
          <div class="kpi-label">Montant PV</div>
        </div>
      </div>
      <table class="synth-table" style="margin-top:16px;">
        <tr><th>Catégorie</th><th>Nombre</th><th>Montant</th></tr>
        <tr><td>Tarifs contrôle</td><td><strong>${stats.tarifsControle}</strong></td><td><span class="amount-badge">${totalTarifsControle.toFixed(2)} €</span></td></tr>
        <tr><td>Procès-verbaux</td><td><strong>${stats.pv}</strong></td><td><span class="amount-badge">${totalPV.toFixed(2)} €</span></td></tr>
        ${stats.totalTarifsBord > 0 ? `<tr><td>Tarifs à bord</td><td><strong>${stats.totalTarifsBord}</strong></td><td>—</td></tr>` : ''}
        ${(stats.riPositive + stats.riNegative) > 0 ? `<tr><td>Relevés d'identité</td><td><strong>${stats.riPositive}+ / ${stats.riNegative}−</strong></td><td>—</td></tr>` : ''}
      </table>
    </div>
  </div>
  ` : ''}

  ` : ''}

  <!-- ── DETAIL TABLE ── -->
  <div class="section">
    <div class="section-header" onclick="toggleSection('detail-controls')">
      <h2><span class="icon">📋</span> Détail des contrôles (${controls.length})</h2>
      <button class="section-toggle">Masquer</button>
    </div>
    <div class="section-body" id="detail-controls">
      <div class="toggles" id="column-toggles">
        <span style="font-size:11px;color:var(--text-muted);font-weight:600;margin-right:4px;">Colonnes :</span>
        <button class="toggle-btn active" onclick="event.stopPropagation();toggleColumn('col-stt')">STT</button>
        <button class="toggle-btn active" onclick="event.stopPropagation();toggleColumn('col-rnv')">RNV</button>
        <button class="toggle-btn active" onclick="event.stopPropagation();toggleColumn('col-pv')">PV</button>
        <button class="toggle-btn active" onclick="event.stopPropagation();toggleColumn('col-ri')">RI</button>
        <button class="toggle-btn active" onclick="event.stopPropagation();toggleColumn('col-tiers')">Titre tiers</button>
        <button class="toggle-btn active" onclick="event.stopPropagation();toggleColumn('col-naiss')">Date naiss.</button>
        <button class="toggle-btn active" onclick="event.stopPropagation();toggleColumn('col-bord')">T. bord</button>
      </div>
      <div class="table-wrap">
        <table class="controls-table" id="controls-table">
          <thead>
            <tr>
              <th onclick="sortTable(0)">Date</th>
              <th onclick="sortTable(1)">Heure</th>
              <th onclick="sortTable(2)">Type</th>
              <th onclick="sortTable(3)">N° / Lieu</th>
              <th onclick="sortTable(4)">Trajet</th>
              <th class="col-num" onclick="sortTable(5)">Voy.</th>
              <th class="col-num" onclick="sortTable(6)">OK</th>
              <th class="col-stt col-num" onclick="sortTable(7)">STT 50€</th>
              <th class="col-stt col-num" onclick="sortTable(8)">STT 100€</th>
              <th class="col-rnv col-num" onclick="sortTable(9)">RNV</th>
              <th class="col-pv col-num" onclick="sortTable(10)">PV</th>
              <th class="col-tiers col-num" onclick="sortTable(11)">T.Tiers</th>
              <th class="col-naiss col-num" onclick="sortTable(12)">D.Naiss.</th>
              <th class="col-ri col-num" onclick="sortTable(13)">RI +/−</th>
              <th class="col-bord col-num" onclick="sortTable(14)">T.Bord</th>
              <th class="col-num" onclick="sortTable(15)">Fraude</th>
            </tr>
          </thead>
          <tbody>
            ${controls.map(control => {
              const d = getControlDetails(control);
              const fraudClass = d.fraudRate > 10 ? 'fraud-high' : d.fraudRate > 5 ? 'fraud-medium' : 'fraud-low';
              const badgeClass = control.location_type === 'train' ? 'badge-train' : control.location_type === 'gare' ? 'badge-gare' : 'badge-quai';
              const typeIcon   = control.location_type === 'train' ? '🚆' : control.location_type === 'gare' ? '🏢' : '🚉';
              const tarifBord  = d.tarifBordStt50 + d.tarifBordStt100 + d.tarifBordRnv + d.tarifBordTitreTiers + d.tarifBordDocNaissance + d.tarifBordAutre;
              const trainId    = (control.train_number || control.location || 'Inconnu').replace(/\s/g, '-');
              return `<tr id="train-${trainId}">
                <td>${d.date}</td>
                <td style="font-variant-numeric:tabular-nums">${d.time}</td>
                <td><span class="badge ${badgeClass}">${typeIcon} ${control.location_type}</span></td>
                <td><strong>${control.location_type === 'train' ? d.trainNumber : d.location}</strong></td>
                <td style="color:var(--text-muted)">${control.location_type === 'train' ? `${d.origin} → ${d.destination}` : '—'}</td>
                <td class="col-num"><strong>${d.passengers}</strong></td>
                <td class="col-num">${d.inRule}</td>
                <td class="col-stt col-num">${d.stt50 || '—'}</td>
                <td class="col-stt col-num">${d.stt100 || '—'}</td>
                <td class="col-rnv col-num">${d.rnv || '—'}</td>
                <td class="col-pv col-num">${d.pv ? `<span class="pv-cell">${d.pv}</span>` : '—'}</td>
                <td class="col-tiers col-num">${d.titreTiers || '—'}</td>
                <td class="col-naiss col-num">${d.docNaissance || '—'}</td>
                <td class="col-ri col-num">${(d.riPositive || d.riNegative) ? `${d.riPositive}/${d.riNegative}` : '—'}</td>
                <td class="col-bord col-num">${tarifBord || '—'}</td>
                <td class="col-num"><span class="${fraudClass}">${d.fraudRateFormatted}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <strong>SNCF Contrôles</strong> &nbsp;·&nbsp; Document généré automatiquement le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })} &nbsp;·&nbsp; Confidentiel
  </div>
</div>

<script>
  function toggleSection(id) {
    const body = document.getElementById(id);
    const btn  = body.closest('.section').querySelector('.section-toggle');
    if (body.classList.contains('hidden')) {
      body.classList.remove('hidden');
      btn.textContent = 'Masquer';
    } else {
      body.classList.add('hidden');
      btn.textContent = 'Afficher';
    }
  }

  function toggleColumn(cls) {
    const cells = document.querySelectorAll('.' + cls);
    const btn   = event.target;
    const isHidden = cells[0]?.style.display === 'none';
    cells.forEach(c => c.style.display = isHidden ? '' : 'none');
    btn.classList.toggle('active', isHidden);
  }

  function sortTable(colIndex) {
    const table = document.getElementById('controls-table');
    const tbody = table.querySelector('tbody');
    const rows  = Array.from(tbody.querySelectorAll('tr'));
    const dir   = table.dataset['sortDir' + colIndex] === 'asc' ? 'desc' : 'asc';
    table.dataset['sortDir' + colIndex] = dir;
    rows.sort((a, b) => {
      let aVal = a.cells[colIndex]?.textContent.trim() || '';
      let bVal = b.cells[colIndex]?.textContent.trim() || '';
      const aNum = parseFloat(aVal.replace(/[^\\d.,-]/g, '').replace(',', '.'));
      const bNum = parseFloat(bVal.replace(/[^\\d.,-]/g, '').replace(',', '.'));
      if (!isNaN(aNum) && !isNaN(bNum)) return dir === 'asc' ? aNum - bNum : bNum - aNum;
      return dir === 'asc' ? aVal.localeCompare(bVal, 'fr') : bVal.localeCompare(aVal, 'fr');
    });
    rows.forEach(r => tbody.appendChild(r));
  }
</script>
</body>
</html>
  `.trim();

  return html;
}

// ─────────────────────────────────────────────────────────────────────────────
export function downloadHTML(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
//  generateEmailContent  (unchanged logic, premium text formatting)
// ─────────────────────────────────────────────────────────────────────────────
export function generateEmailContent({ controls, title, dateRange, includeStats }: ExportOptions): { subject: string; body: string } {
  const stats = calculateExtendedStats(controls);

  const subject = `[SNCF Contrôles] ${title} - ${dateRange}`;

  let body = `════════════════════════════════════════\n`;
  body += `     SNCF CONTRÔLES — RAPPORT\n`;
  body += `════════════════════════════════════════\n\n`;
  body += `📅 ${title}\n`;
  body += `📆 Période : ${dateRange}\n`;
  body += `🕐 Généré le : ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}\n`;
  body += `📊 Total : ${controls.length} contrôle${controls.length > 1 ? 's' : ''}\n\n`;

  if (includeStats) {
    body += `┌─────────────────────────────────────────┐\n`;
    body += `│         RÉSUMÉ STATISTIQUE              │\n`;
    body += `└─────────────────────────────────────────┘\n\n`;

    body += `👥 VOYAGEURS\n`;
    body += `   Total : ${stats.totalPassengers}\n`;
    body += `   En règle : ${stats.passengersInRule}\n`;
    body += `   Taux de fraude : ${formatFraudRate(stats.fraudRate)}\n\n`;

    body += `📍 RÉPARTITION PAR TYPE\n`;
    body += `   🚆 Trains : ${stats.byLocationType.train.length}\n`;
    body += `   🏢 Gares  : ${stats.byLocationType.gare.length}\n`;
    body += `   🚉 Quais  : ${stats.byLocationType.quai.length}\n\n`;

    const totalTarifsAmt = stats.totalAmounts.stt50 + stats.totalAmounts.rnv
      + stats.totalAmounts.titreTiers + stats.totalAmounts.docNaissance + stats.totalAmounts.autre;
    body += `💶 TARIFS CONTRÔLE (régularisations)\n`;
    if (stats.stt50 > 0) body += `   STT 50€     : ${stats.stt50} (${stats.totalAmounts.stt50.toFixed(2)} €)\n`;
    if (stats.rnv > 0) body += `   RNV         : ${stats.rnv} (${stats.totalAmounts.rnv.toFixed(2)} €)\n`;
    if (stats.tarifsControleDetails.titreTiers > 0) body += `   Titre tiers : ${stats.tarifsControleDetails.titreTiers} (${stats.totalAmounts.titreTiers.toFixed(2)} €)\n`;
    if (stats.tarifsControleDetails.docNaissance > 0) body += `   Date naiss. : ${stats.tarifsControleDetails.docNaissance} (${stats.totalAmounts.docNaissance.toFixed(2)} €)\n`;
    if (stats.tarifsControleDetails.autre > 0) body += `   Autre       : ${stats.tarifsControleDetails.autre} (${stats.totalAmounts.autre.toFixed(2)} €)\n`;
    body += `   ────────────────────────\n`;
    body += `   TOTAL : ${stats.tarifsControle}  (${totalTarifsAmt.toFixed(2)} €)\n\n`;

    const totalPVAmt = stats.totalAmounts.stt100 + stats.totalAmounts.pvStt100
      + stats.totalAmounts.pvRnv + stats.totalAmounts.pvTitreTiers
      + stats.totalAmounts.pvDocNaissance + stats.totalAmounts.pvAutre;
    body += `⚠️  PV (procès-verbaux)\n`;
    if (stats.stt100 > 0) body += `   STT 100€         : ${stats.stt100} (${stats.totalAmounts.stt100.toFixed(2)} €)\n`;
    if (stats.pvBreakdown.stt100 > 0) body += `   STT autre montant: ${stats.pvBreakdown.stt100} (${stats.totalAmounts.pvStt100.toFixed(2)} €)\n`;
    if (stats.pvBreakdown.rnv > 0) body += `   RNV              : ${stats.pvBreakdown.rnv} (${stats.totalAmounts.pvRnv.toFixed(2)} €)\n`;
    if (stats.pvBreakdown.titreTiers > 0) body += `   Titre tiers      : ${stats.pvBreakdown.titreTiers} (${stats.totalAmounts.pvTitreTiers.toFixed(2)} €)\n`;
    if (stats.pvBreakdown.docNaissance > 0) body += `   D. naissance     : ${stats.pvBreakdown.docNaissance} (${stats.totalAmounts.pvDocNaissance.toFixed(2)} €)\n`;
    if (stats.pvBreakdown.autre > 0) body += `   Autre            : ${stats.pvBreakdown.autre} (${stats.totalAmounts.pvAutre.toFixed(2)} €)\n`;
    body += `   ────────────────────────\n`;
    body += `   TOTAL : ${stats.pv}  (${totalPVAmt.toFixed(2)} €)\n\n`;

    if (stats.totalTarifsBord > 0) {
      body += `🎫 TARIFS À BORD (ventes)\n`;
      if (stats.tarifsBord.stt50 > 0) body += `   Bord         : ${stats.tarifsBord.stt50} (${stats.tarifsBord.stt50Amount.toFixed(2)} €)\n`;
      if (stats.tarifsBord.stt100 > 0) body += `   Exceptionnel : ${stats.tarifsBord.stt100} (${stats.tarifsBord.stt100Amount.toFixed(2)} €)\n`;
      if (stats.tarifsBord.rnv > 0) body += `   RNV          : ${stats.tarifsBord.rnv} (${stats.tarifsBord.rnvAmount.toFixed(2)} €)\n`;
      if (stats.tarifsBord.titreTiers > 0) body += `   Titre tiers  : ${stats.tarifsBord.titreTiers} (${stats.tarifsBord.titreTiersAmount.toFixed(2)} €)\n`;
      if (stats.tarifsBord.docNaissance > 0) body += `   Date naiss.  : ${stats.tarifsBord.docNaissance} (${stats.tarifsBord.docNaissanceAmount.toFixed(2)} €)\n`;
      if (stats.tarifsBord.autre > 0) body += `   Autre        : ${stats.tarifsBord.autre} (${stats.tarifsBord.autreAmount.toFixed(2)} €)\n`;
      body += `   ────────────────────────\n`;
      body += `   TOTAL : ${stats.totalTarifsBord}\n\n`;
    }

    body += `🔍 RELEVÉS D'IDENTITÉ (RI)\n`;
    body += `   RI Positif : ${stats.riPositive}\n`;
    body += `   RI Négatif : ${stats.riNegative}\n`;
    body += `   ────────────────────────\n`;
    body += `   TOTAL : ${stats.riPositive + stats.riNegative}\n\n`;
  }

  body += `┌─────────────────────────────────────────┐\n`;
  body += `│         DÉTAIL DES CONTRÔLES            │\n`;
  body += `└─────────────────────────────────────────┘\n\n`;

  controls.forEach((control, index) => {
    const details   = getControlDetails(control);
    const typeEmoji = control.location_type === 'train' ? '🚆' : control.location_type === 'gare' ? '🏢' : '🚉';

    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `${index + 1}. ${typeEmoji} ${control.location_type.toUpperCase()} — ${details.date} à ${details.time}\n`;
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    if (control.location_type === 'train') {
      body += `   N° Train : ${details.trainNumber}\n`;
      body += `   Trajet   : ${details.origin} → ${details.destination}\n`;
    } else {
      body += `   Lieu : ${details.location}\n`;
      if (control.platform_number) body += `   Quai : ${details.platformNumber}\n`;
    }

    body += `\n   👥 Voyageurs : ${details.passengers}  |  En règle : ${details.inRule}\n`;
    body += `   📊 Taux de fraude : ${details.fraudRateFormatted}\n\n`;

    if (details.tarifsControle > 0) {
      const tcParts: string[] = [];
      if (details.stt50 > 0) tcParts.push(`STT 50€: ${details.stt50}`);
      if (details.stt100 > 0) tcParts.push(`STT 100€: ${details.stt100}`);
      if (details.rnv > 0) tcParts.push(`RNV: ${details.rnv}`);
      if (details.titreTiers > 0) tcParts.push(`T.Tiers: ${details.titreTiers}`);
      if (details.docNaissance > 0) tcParts.push(`D.Naiss.: ${details.docNaissance}`);
      if (details.autreTarif > 0) tcParts.push(`Autre: ${details.autreTarif}`);
      body += `   💶 Tarifs contrôle : ${tcParts.join('  |  ')}\n`;
    }
    if (details.pv > 0) {
      body += `\n   ⚠️  PV : ${details.pv}\n`;
      const pvParts: string[] = [];
      if (details.pvStt100 > 0) pvParts.push(`STT100: ${details.pvStt100}`);
      if (details.pvRnv > 0) pvParts.push(`RNV: ${details.pvRnv}`);
      if (details.pvTitreTiers > 0) pvParts.push(`T.Tiers: ${details.pvTitreTiers}`);
      if (details.pvDocNaissance > 0) pvParts.push(`D.Naiss.: ${details.pvDocNaissance}`);
      if (details.pvAutre > 0) pvParts.push(`Autre: ${details.pvAutre}`);
      if (pvParts.length > 0) body += `      ${pvParts.join('  |  ')}\n`;
    }
    body += `\n   🔍 RI : +${details.riPositive} / −${details.riNegative}\n`;

    if (details.notes) body += `\n   📝 Notes : ${details.notes}\n`;
    body += `\n`;
  });

  body += `════════════════════════════════════════\n`;
  body += `     Fin du rapport\n`;
  body += `════════════════════════════════════════\n`;

  return { subject, body };
}

export function openMailClient(email: { subject: string; body: string }) {
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
  window.open(mailtoUrl, '_blank');
}
