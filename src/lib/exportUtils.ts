import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';
import { calculateStats, formatFraudRate } from './stats';

type Control = Database['public']['Tables']['controls']['Row'];

export type PdfOrientationType = 'portrait' | 'landscape' | 'auto';

export interface ExportOptions {
  controls: Control[];
  title: string;
  dateRange: string;
  includeStats: boolean;
  orientation?: PdfOrientationType;
}

function getControlDetails(control: Control) {
  const fraudCount = control.tarifs_controle + control.pv;
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
    pvAbsenceTitre: control.pv_absence_titre || 0,
    pvTitreInvalide: control.pv_titre_invalide || 0,
    pvRefusControle: control.pv_refus_controle || 0,
    pvAutre: control.pv_autre || 0,
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
    // Tarifs bord
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
  
  // Group by location type
  const byLocationType = {
    train: controls.filter(c => c.location_type === 'train'),
    gare: controls.filter(c => c.location_type === 'gare'),
    quai: controls.filter(c => c.location_type === 'quai'),
  };

  // Calculate amounts
  const totalAmounts = controls.reduce((acc, c) => ({
    stt50: acc.stt50 + (c.stt_50_amount || 0),
    stt100: acc.stt100 + (c.stt_100_amount || 0),
    rnv: acc.rnv + (c.rnv_amount || 0),
    titreTiers: acc.titreTiers + (c.titre_tiers_amount || 0),
    docNaissance: acc.docNaissance + (c.doc_naissance_amount || 0),
    autre: acc.autre + (c.autre_tarif_amount || 0),
    pvAbsenceTitre: acc.pvAbsenceTitre + (c.pv_absence_titre_amount || 0),
    pvTitreInvalide: acc.pvTitreInvalide + (c.pv_titre_invalide_amount || 0),
    pvRefusControle: acc.pvRefusControle + (c.pv_refus_controle_amount || 0),
    pvAutre: acc.pvAutre + (c.pv_autre_amount || 0),
  }), {
    stt50: 0, stt100: 0, rnv: 0, titreTiers: 0, docNaissance: 0, autre: 0,
    pvAbsenceTitre: 0, pvTitreInvalide: 0, pvRefusControle: 0, pvAutre: 0,
  });

  // PV breakdown
  const pvBreakdown = controls.reduce((acc, c) => ({
    absenceTitre: acc.absenceTitre + (c.pv_absence_titre || 0),
    titreInvalide: acc.titreInvalide + (c.pv_titre_invalide || 0),
    refusControle: acc.refusControle + (c.pv_refus_controle || 0),
    autre: acc.autre + (c.pv_autre || 0),
  }), { absenceTitre: 0, titreInvalide: 0, refusControle: 0, autre: 0 });

  // Tarifs bord
  const tarifsBord = controls.reduce((acc, c) => ({
    stt50: acc.stt50 + (c.tarif_bord_stt_50 || 0),
    stt100: acc.stt100 + (c.tarif_bord_stt_100 || 0),
    rnv: acc.rnv + (c.tarif_bord_rnv || 0),
    titreTiers: acc.titreTiers + (c.tarif_bord_titre_tiers || 0),
    docNaissance: acc.docNaissance + (c.tarif_bord_doc_naissance || 0),
    autre: acc.autre + (c.tarif_bord_autre || 0),
  }), { stt50: 0, stt100: 0, rnv: 0, titreTiers: 0, docNaissance: 0, autre: 0 });

  // Additional tarifs controle
  const tarifsControleDetails = controls.reduce((acc, c) => ({
    titreTiers: acc.titreTiers + (c.titre_tiers || 0),
    docNaissance: acc.docNaissance + (c.doc_naissance || 0),
    autre: acc.autre + (c.autre_tarif || 0),
  }), { titreTiers: 0, docNaissance: 0, autre: 0 });

  return {
    ...base,
    byLocationType,
    totalAmounts,
    pvBreakdown,
    tarifsBord,
    tarifsControleDetails,
    totalTarifsBord: tarifsBord.stt50 + tarifsBord.stt100 + tarifsBord.rnv + tarifsBord.titreTiers + tarifsBord.docNaissance + tarifsBord.autre,
  };
}

export function exportToPDF({ controls, title, dateRange, includeStats, orientation = 'auto' }: ExportOptions): jsPDF {
  // Validate inputs early
  if (!controls || controls.length === 0) {
    throw new Error('Aucun contrôle à exporter');
  }

  // Determine orientation: auto uses landscape if many controls or includeStats
  const useOrientation = orientation === 'auto' 
    ? (controls.length > 10 || includeStats ? 'landscape' : 'portrait')
    : orientation;

  const doc = new jsPDF({ orientation: useOrientation === 'landscape' ? 'landscape' : 'portrait' });
  const stats = calculateExtendedStats(controls);
  let pageNumber = 1;
  
  // Helper to add footer on each page
  const addFooter = () => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `SNCF Contrôles - Page ${pageNumber}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  };
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 139);
  doc.text('SNCF Contrôles', 14, 20);
  
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text('Rapport détaillé', 14, 28);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(title, 14, 36);
  doc.text(`Période: ${dateRange}`, 14, 42);
  doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 14, 48);
  doc.text(`Total contrôles: ${controls.length}`, 14, 54);

  let yPosition = 64;

  if (includeStats) {
    // Main statistics
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Statistiques générales', 14, yPosition);
    yPosition += 8;

    const mainStatsData = [
      ['Métrique', 'Nombre', 'Détail'],
      ['Total voyageurs', stats.totalPassengers.toString(), `${stats.passengersInRule} en règle`],
      ['Taux de fraude global', formatFraudRate(stats.fraudRate), `${stats.fraudCount} infractions`],
      ['Contrôles par type', '', `Train: ${stats.byLocationType.train.length} | Gare: ${stats.byLocationType.gare.length} | Quai: ${stats.byLocationType.quai.length}`],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [mainStatsData[0]],
      body: mainStatsData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 139], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    // Tarifs contrôle detail
    doc.setFontSize(11);
    doc.text('Détail Tarifs Contrôle (régularisations)', 14, yPosition);
    yPosition += 6;

    const tarifsData = [
      ['Type', 'Nombre', 'Montant (€)'],
      ['STT 50€', stats.stt50.toString(), stats.totalAmounts.stt50.toFixed(2)],
      ['STT 100€', stats.stt100.toString(), stats.totalAmounts.stt100.toFixed(2)],
      ['RNV', stats.rnv.toString(), stats.totalAmounts.rnv.toFixed(2)],
      ['Titre tiers', stats.tarifsControleDetails.titreTiers.toString(), stats.totalAmounts.titreTiers.toFixed(2)],
      ['Date naissance', stats.tarifsControleDetails.docNaissance.toString(), stats.totalAmounts.docNaissance.toFixed(2)],
      ['Autre tarif', stats.tarifsControleDetails.autre.toString(), stats.totalAmounts.autre.toFixed(2)],
      ['TOTAL', stats.tarifsControle.toString(), (stats.totalAmounts.stt50 + stats.totalAmounts.stt100 + stats.totalAmounts.rnv + stats.totalAmounts.titreTiers + stats.totalAmounts.docNaissance + stats.totalAmounts.autre).toFixed(2)],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [tarifsData[0]],
      body: tarifsData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [34, 139, 34], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 100 },
      tableWidth: 80,
    });

    // PV detail (on the right)
    doc.setFontSize(11);
    doc.text('Détail PV (procès-verbaux)', 110, yPosition);

    const pvData = [
      ['Type', 'Nombre', 'Montant (€)'],
      ['Absence de titre', stats.pvBreakdown.absenceTitre.toString(), stats.totalAmounts.pvAbsenceTitre.toFixed(2)],
      ['Titre invalide', stats.pvBreakdown.titreInvalide.toString(), stats.totalAmounts.pvTitreInvalide.toFixed(2)],
      ['Refus contrôle', stats.pvBreakdown.refusControle.toString(), stats.totalAmounts.pvRefusControle.toFixed(2)],
      ['Autre PV', stats.pvBreakdown.autre.toString(), stats.totalAmounts.pvAutre.toFixed(2)],
      ['TOTAL', stats.pv.toString(), (stats.totalAmounts.pvAbsenceTitre + stats.totalAmounts.pvTitreInvalide + stats.totalAmounts.pvRefusControle + stats.totalAmounts.pvAutre).toFixed(2)],
    ];

    autoTable(doc, {
      startY: yPosition + 6,
      head: [pvData[0]],
      body: pvData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [178, 34, 34], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 110, right: 14 },
      tableWidth: 80,
    });

    yPosition = Math.max(
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY,
      yPosition + 50
    ) + 10;

    // Tarifs bord
    doc.setFontSize(11);
    doc.text('Tarifs à bord (ventes)', 14, yPosition);
    yPosition += 6;

    const tarifsBordData = [
      ['Type', 'Nombre'],
      ['STT 50€', stats.tarifsBord.stt50.toString()],
      ['STT 100€', stats.tarifsBord.stt100.toString()],
      ['RNV', stats.tarifsBord.rnv.toString()],
      ['Titre tiers', stats.tarifsBord.titreTiers.toString()],
      ['Date naissance', stats.tarifsBord.docNaissance.toString()],
      ['Autre', stats.tarifsBord.autre.toString()],
      ['TOTAL', stats.totalTarifsBord.toString()],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [tarifsBordData[0]],
      body: tarifsBordData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [70, 130, 180], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 140 },
      tableWidth: 60,
    });

    // Identity checks (on the right)
    doc.setFontSize(11);
    doc.text('Contrôles d\'identité (RI)', 90, yPosition);

    const riData = [
      ['Type', 'Nombre'],
      ['RI Positive', stats.riPositive.toString()],
      ['RI Négative', stats.riNegative.toString()],
      ['TOTAL', (stats.riPositive + stats.riNegative).toString()],
    ];

    autoTable(doc, {
      startY: yPosition + 6,
      head: [riData[0]],
      body: riData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [148, 103, 189], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 90, right: 80 },
      tableWidth: 50,
    });

    yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Check if we need a new page
  if (yPosition > 240) {
    doc.addPage();
    yPosition = 20;
  }

  // Controls detail table
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Détail des contrôles', 14, yPosition);
  yPosition += 8;

  const tableData = controls.map(control => {
    const details = getControlDetails(control);
    const locationInfo = control.location_type === 'train' 
      ? `Train ${details.trainNumber}`
      : control.location_type === 'gare' 
        ? `Gare ${details.location}`
        : `Quai ${details.platformNumber}`;
    return [
      details.date,
      details.time,
      locationInfo,
      control.location_type === 'train' ? `${details.origin} → ${details.destination}` : details.location,
      details.passengers.toString(),
      details.inRule.toString(),
      `${details.stt50}/${details.stt100}`,
      details.rnv.toString(),
      details.pv.toString(),
      `${details.riPositive}/${details.riNegative}`,
      details.fraudRateFormatted,
    ];
  });

  autoTable(doc, {
    startY: yPosition,
    head: [['Date', 'Heure', 'Type/N°', 'Lieu/Trajet', 'Voy.', 'OK', 'STT', 'RNV', 'PV', 'RI', 'Fraude']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [0, 0, 139], fontSize: 6, cellPadding: 1.5, halign: 'center' },
    bodyStyles: { fontSize: 5.5, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },  // Date
      1: { cellWidth: 10, halign: 'center' },  // Heure
      2: { cellWidth: 20 },                     // Type/N°
      3: { cellWidth: 32 },                     // Lieu/Trajet
      4: { cellWidth: 10, halign: 'center' },  // Voy.
      5: { cellWidth: 8, halign: 'center' },   // OK
      6: { cellWidth: 12, halign: 'center' },  // STT
      7: { cellWidth: 8, halign: 'center' },   // RNV
      8: { cellWidth: 8, halign: 'center' },   // PV
      9: { cellWidth: 12, halign: 'center' },  // RI
      10: { cellWidth: 12, halign: 'center' }, // Fraude
    },
    margin: { left: 10, right: 10 },
    tableWidth: 'auto',
    didDrawPage: function() {
      addFooter();
      pageNumber++;
    }
  });

  return doc;
}

// Generate PDF and return blob URL for preview
export function generatePDFPreview(options: ExportOptions): string {
  const doc = exportToPDF(options);
  const pdfBlob = doc.output('blob');
  return URL.createObjectURL(pdfBlob);
}

// Download PDF from jsPDF document
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

// Export table view to PDF (simplified version for table export)
export interface TableExportOptions {
  controls: Control[];
  title: string;
  dateRange: string;
}

export function exportTableToPDF({ controls, title, dateRange }: TableExportOptions) {
  if (!controls || controls.length === 0) {
    throw new Error('Aucun contrôle à exporter');
  }

  try {
    const doc = new jsPDF({ orientation: 'landscape' });
    let currentPage = 1;
    
    const addPageFooter = () => {
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `SNCF Contrôles - Page ${currentPage}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    };
    
    // Header
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 139);
    doc.text('SNCF Contrôles - Tableau', 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(title, 14, 22);
    doc.text(`Période: ${dateRange}`, 14, 28);
    doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 14, 34);
    doc.text(`Total: ${controls.length} contrôle(s)`, 14, 40);

    // Build table data with all details
    const tableData = controls.map(control => {
      const fraudCount = control.tarifs_controle + control.pv;
      const fraudRate = control.nb_passagers > 0 
        ? ((fraudCount / control.nb_passagers) * 100).toFixed(1) + '%'
        : '0.0%';
      
      const locationInfo = control.location_type === 'train' 
        ? `Train ${control.train_number || '-'}`
        : control.location_type === 'gare' 
          ? 'Gare'
          : 'Quai';
      
      const trajet = control.origin && control.destination 
        ? `${control.origin} → ${control.destination}`
        : control.location;

      // Tarifs à bord sum
      const tarifBordTotal = (control.tarif_bord_stt_50 || 0) + 
        (control.tarif_bord_stt_100 || 0) + 
        (control.tarif_bord_rnv || 0) +
        (control.tarif_bord_titre_tiers || 0) +
        (control.tarif_bord_doc_naissance || 0) +
        (control.tarif_bord_autre || 0);

      // Titre tiers + doc naissance
      const titreTiers = control.titre_tiers || 0;
      const docNaissance = control.doc_naissance || 0;

      return [
        format(new Date(control.control_date), 'dd/MM/yy', { locale: fr }),
        control.control_time.slice(0, 5),
        locationInfo,
        trajet,
        control.nb_passagers.toString(),
        control.nb_en_regle.toString(),
        tarifBordTotal.toString(),
        control.tarifs_controle.toString(),
        titreTiers.toString(),
        docNaissance.toString(),
        control.pv.toString(),
        control.stt_50.toString(),
        control.stt_100.toString(),
        control.rnv.toString(),
        control.ri_positive.toString(),
        control.ri_negative.toString(),
        fraudRate,
      ];
    });

    autoTable(doc, {
      startY: 46,
      head: [['Date', 'Heure', 'Type', 'Trajet', 'V.', 'OK', 'B.', 'TC', 'Ti', 'Na', 'PV', 'S50', 'S100', 'RNV', 'R+', 'R-', '%']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [0, 0, 139], 
        fontSize: 6,
        cellPadding: 1.5,
        halign: 'center'
      },
      bodyStyles: { 
        fontSize: 5.5,
        cellPadding: 1.5,
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 13 },                   // Date
        1: { cellWidth: 10 },                   // Heure
        2: { cellWidth: 15 },                   // Type
        3: { cellWidth: 38 },                   // Trajet
        4: { cellWidth: 8, halign: 'center' },  // Voy.
        5: { cellWidth: 8, halign: 'center' },  // OK
        6: { cellWidth: 8, halign: 'center' },  // Bord
        7: { cellWidth: 8, halign: 'center' },  // T.C.
        8: { cellWidth: 8, halign: 'center' },  // Tiers
        9: { cellWidth: 8, halign: 'center' },  // Naiss.
        10: { cellWidth: 8, halign: 'center' }, // PV
        11: { cellWidth: 10, halign: 'center' },// STT50
        12: { cellWidth: 12, halign: 'center' },// STT100
        13: { cellWidth: 10, halign: 'center' },// RNV
        14: { cellWidth: 8, halign: 'center' }, // RI+
        15: { cellWidth: 8, halign: 'center' }, // RI-
        16: { cellWidth: 12, halign: 'center' },// Fraude
      },
      margin: { left: 8, right: 8 },
      tableWidth: 'auto',
      didDrawPage: function() {
        addPageFooter();
        currentPage++;
      }
    });

    const filename = `tableau-controles-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
    
    // Use blob method for better cross-browser support
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);

  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error('Erreur lors de la génération du PDF. Veuillez réessayer.');
  }
}

export function exportToHTML({ controls, title, dateRange, includeStats }: ExportOptions): string {
  const stats = calculateExtendedStats(controls);
  
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - SNCF Contrôles</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f0f2f5; color: #1a1a2e; }
    .container { max-width: 1400px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #00008B 0%, #1a1a6e 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; }
    .header .meta { opacity: 0.9; font-size: 14px; }
    .section { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .section h2 { margin: 0 0 20px 0; color: #00008B; font-size: 18px; border-bottom: 2px solid #00008B; padding-bottom: 10px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
    .stat-card { background: #f8f9fa; padding: 16px; border-radius: 8px; text-align: center; border-left: 4px solid #00008B; }
    .stat-card.green { border-left-color: #22c55e; }
    .stat-card.red { border-left-color: #ef4444; }
    .stat-card.blue { border-left-color: #3b82f6; }
    .stat-card.purple { border-left-color: #8b5cf6; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1a1a2e; }
    .stat-label { font-size: 11px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .detail-table { width: 100%; border-collapse: collapse; }
    .detail-table th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; color: #64748b; }
    .detail-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .detail-table tr:hover { background: #f8fafc; }
    .detail-table .total { background: #f1f5f9; font-weight: bold; }
    .controls-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .controls-table th { background: #00008B; color: white; padding: 12px 8px; text-align: left; position: sticky; top: 0; }
    .controls-table td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; }
    .controls-table tr:hover { background: #f0f9ff; }
    .controls-table tr:nth-child(even) { background: #f8fafc; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
    .badge-train { background: #dbeafe; color: #1d4ed8; }
    .badge-gare { background: #fef3c7; color: #92400e; }
    .badge-quai { background: #d1fae5; color: #065f46; }
    .fraud-high { color: #dc2626; font-weight: bold; }
    .fraud-medium { color: #f59e0b; font-weight: 600; }
    .fraud-low { color: #16a34a; }
    .footer { text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; }
    @media print {
      body { background: white; padding: 0; }
      .section { box-shadow: none; border: 1px solid #e2e8f0; }
      .controls-table th { background: #1a1a2e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚂 SNCF Contrôles - Rapport</h1>
      <div class="meta">
        <p><strong>${title}</strong></p>
        <p>Période: ${dateRange} | Généré le: ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
        <p>Total: ${controls.length} contrôle${controls.length > 1 ? 's' : ''}</p>
      </div>
    </div>
    
    ${includeStats ? `
    <div class="section">
      <h2>📊 Vue d'ensemble</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.totalPassengers}</div>
          <div class="stat-label">Voyageurs</div>
        </div>
        <div class="stat-card green">
          <div class="stat-value">${stats.passengersInRule}</div>
          <div class="stat-label">En règle</div>
        </div>
        <div class="stat-card red">
          <div class="stat-value">${formatFraudRate(stats.fraudRate)}</div>
          <div class="stat-label">Taux fraude</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.tarifsControle}</div>
          <div class="stat-label">Tarifs contrôle</div>
        </div>
        <div class="stat-card red">
          <div class="stat-value">${stats.pv}</div>
          <div class="stat-label">PV</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-value">${stats.totalTarifsBord}</div>
          <div class="stat-label">Tarifs bord</div>
        </div>
        <div class="stat-card purple">
          <div class="stat-value">${stats.riPositive + stats.riNegative}</div>
          <div class="stat-label">Contrôles ID</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>📈 Répartition par type de lieu</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.byLocationType.train.length}</div>
          <div class="stat-label">🚆 Trains</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.byLocationType.gare.length}</div>
          <div class="stat-label">🏢 Gares</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.byLocationType.quai.length}</div>
          <div class="stat-label">🚉 Quais</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>💶 Détail des opérations</h2>
      <div class="detail-grid">
        <div>
          <h3 style="color: #22c55e; margin-bottom: 12px;">Tarifs Contrôle (régularisations)</h3>
          <table class="detail-table">
            <tr><th>Type</th><th>Nombre</th><th>Montant</th></tr>
            <tr><td>STT 50€</td><td>${stats.stt50}</td><td>${stats.totalAmounts.stt50.toFixed(2)} €</td></tr>
            <tr><td>STT 100€</td><td>${stats.stt100}</td><td>${stats.totalAmounts.stt100.toFixed(2)} €</td></tr>
            <tr><td>RNV</td><td>${stats.rnv}</td><td>${stats.totalAmounts.rnv.toFixed(2)} €</td></tr>
            <tr><td>Titre tiers</td><td>${stats.tarifsControleDetails.titreTiers}</td><td>${stats.totalAmounts.titreTiers.toFixed(2)} €</td></tr>
            <tr><td>Date naissance</td><td>${stats.tarifsControleDetails.docNaissance}</td><td>${stats.totalAmounts.docNaissance.toFixed(2)} €</td></tr>
            <tr><td>Autre tarif</td><td>${stats.tarifsControleDetails.autre}</td><td>${stats.totalAmounts.autre.toFixed(2)} €</td></tr>
            <tr class="total"><td>TOTAL</td><td>${stats.tarifsControle}</td><td>${(stats.totalAmounts.stt50 + stats.totalAmounts.stt100 + stats.totalAmounts.rnv + stats.totalAmounts.titreTiers + stats.totalAmounts.docNaissance + stats.totalAmounts.autre).toFixed(2)} €</td></tr>
          </table>
        </div>
        <div>
          <h3 style="color: #ef4444; margin-bottom: 12px;">PV (procès-verbaux)</h3>
          <table class="detail-table">
            <tr><th>Type</th><th>Nombre</th><th>Montant</th></tr>
            <tr><td>Absence de titre</td><td>${stats.pvBreakdown.absenceTitre}</td><td>${stats.totalAmounts.pvAbsenceTitre.toFixed(2)} €</td></tr>
            <tr><td>Titre invalide</td><td>${stats.pvBreakdown.titreInvalide}</td><td>${stats.totalAmounts.pvTitreInvalide.toFixed(2)} €</td></tr>
            <tr><td>Refus contrôle</td><td>${stats.pvBreakdown.refusControle}</td><td>${stats.totalAmounts.pvRefusControle.toFixed(2)} €</td></tr>
            <tr><td>Autre PV</td><td>${stats.pvBreakdown.autre}</td><td>${stats.totalAmounts.pvAutre.toFixed(2)} €</td></tr>
            <tr class="total"><td>TOTAL</td><td>${stats.pv}</td><td>${(stats.totalAmounts.pvAbsenceTitre + stats.totalAmounts.pvTitreInvalide + stats.totalAmounts.pvRefusControle + stats.totalAmounts.pvAutre).toFixed(2)} €</td></tr>
          </table>
        </div>
        <div>
          <h3 style="color: #3b82f6; margin-bottom: 12px;">Tarifs à bord (ventes)</h3>
          <table class="detail-table">
            <tr><th>Type</th><th>Nombre</th></tr>
            <tr><td>STT 50€</td><td>${stats.tarifsBord.stt50}</td></tr>
            <tr><td>STT 100€</td><td>${stats.tarifsBord.stt100}</td></tr>
            <tr><td>RNV</td><td>${stats.tarifsBord.rnv}</td></tr>
            <tr><td>Titre tiers</td><td>${stats.tarifsBord.titreTiers}</td></tr>
            <tr><td>Date naissance</td><td>${stats.tarifsBord.docNaissance}</td></tr>
            <tr><td>Autre</td><td>${stats.tarifsBord.autre}</td></tr>
            <tr class="total"><td>TOTAL</td><td>${stats.totalTarifsBord}</td></tr>
          </table>
        </div>
        <div>
          <h3 style="color: #8b5cf6; margin-bottom: 12px;">Contrôles d'identité (RI)</h3>
          <table class="detail-table">
            <tr><th>Type</th><th>Nombre</th></tr>
            <tr><td>RI Positive</td><td>${stats.riPositive}</td></tr>
            <tr><td>RI Négative</td><td>${stats.riNegative}</td></tr>
            <tr class="total"><td>TOTAL</td><td>${stats.riPositive + stats.riNegative}</td></tr>
          </table>
        </div>
      </div>
    </div>
    ` : ''}
    
    <div class="section">
      <h2>📋 Détail des contrôles</h2>
      <div style="overflow-x: auto;">
        <table class="controls-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Heure</th>
              <th>Type</th>
              <th>N° / Lieu</th>
              <th>Trajet</th>
              <th>Voy.</th>
              <th>OK</th>
              <th>STT 50€</th>
              <th>STT 100€</th>
              <th>RNV</th>
              <th>PV</th>
              <th>RI +/-</th>
              <th>Fraude</th>
            </tr>
          </thead>
          <tbody>
            ${controls.map(control => {
              const details = getControlDetails(control);
              const fraudClass = details.fraudRate > 10 ? 'fraud-high' : details.fraudRate > 5 ? 'fraud-medium' : 'fraud-low';
              const badgeClass = control.location_type === 'train' ? 'badge-train' : control.location_type === 'gare' ? 'badge-gare' : 'badge-quai';
              const typeLabel = control.location_type === 'train' ? '🚆' : control.location_type === 'gare' ? '🏢' : '🚉';
              return `
              <tr>
                <td>${details.date}</td>
                <td>${details.time}</td>
                <td><span class="badge ${badgeClass}">${typeLabel} ${control.location_type}</span></td>
                <td>${control.location_type === 'train' ? details.trainNumber : details.location}</td>
                <td>${control.location_type === 'train' ? `${details.origin} → ${details.destination}` : '-'}</td>
                <td><strong>${details.passengers}</strong></td>
                <td>${details.inRule}</td>
                <td>${details.stt50}</td>
                <td>${details.stt100}</td>
                <td>${details.rnv}</td>
                <td>${details.pv}</td>
                <td>${details.riPositive}/${details.riNegative}</td>
                <td class="${fraudClass}">${details.fraudRateFormatted}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} SNCF Contrôles - Rapport généré automatiquement</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return html;
}

export function downloadHTML(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateEmailContent({ controls, title, dateRange, includeStats }: ExportOptions): { subject: string; body: string } {
  const stats = calculateExtendedStats(controls);
  
  const subject = `[SNCF Contrôles] ${title} - ${dateRange}`;
  
  let body = `════════════════════════════════════════\n`;
  body += `     SNCF CONTRÔLES - RAPPORT\n`;
  body += `════════════════════════════════════════\n\n`;
  body += `📅 ${title}\n`;
  body += `📆 Période: ${dateRange}\n`;
  body += `🕐 Généré le: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}\n`;
  body += `📊 Total: ${controls.length} contrôle${controls.length > 1 ? 's' : ''}\n\n`;
  
  if (includeStats) {
    body += `┌─────────────────────────────────────────┐\n`;
    body += `│         RÉSUMÉ STATISTIQUE              │\n`;
    body += `└─────────────────────────────────────────┘\n\n`;
    
    body += `👥 VOYAGEURS\n`;
    body += `   Total voyageurs: ${stats.totalPassengers}\n`;
    body += `   En règle: ${stats.passengersInRule}\n`;
    body += `   Taux de fraude: ${formatFraudRate(stats.fraudRate)}\n\n`;
    
    body += `📍 RÉPARTITION PAR TYPE\n`;
    body += `   🚆 Trains: ${stats.byLocationType.train.length}\n`;
    body += `   🏢 Gares: ${stats.byLocationType.gare.length}\n`;
    body += `   🚉 Quais: ${stats.byLocationType.quai.length}\n\n`;
    
    body += `💶 TARIFS CONTRÔLE (régularisations)\n`;
    body += `   STT 50€: ${stats.stt50} (${stats.totalAmounts.stt50.toFixed(2)} €)\n`;
    body += `   STT 100€: ${stats.stt100} (${stats.totalAmounts.stt100.toFixed(2)} €)\n`;
    body += `   RNV: ${stats.rnv} (${stats.totalAmounts.rnv.toFixed(2)} €)\n`;
    body += `   Titre tiers: ${stats.tarifsControleDetails.titreTiers} (${stats.totalAmounts.titreTiers.toFixed(2)} €)\n`;
    body += `   Date naissance: ${stats.tarifsControleDetails.docNaissance} (${stats.totalAmounts.docNaissance.toFixed(2)} €)\n`;
    body += `   Autre: ${stats.tarifsControleDetails.autre} (${stats.totalAmounts.autre.toFixed(2)} €)\n`;
    body += `   ─────────────────────────────\n`;
    body += `   TOTAL: ${stats.tarifsControle}\n\n`;
    
    body += `⚠️ PV (procès-verbaux)\n`;
    body += `   Absence de titre: ${stats.pvBreakdown.absenceTitre} (${stats.totalAmounts.pvAbsenceTitre.toFixed(2)} €)\n`;
    body += `   Titre invalide: ${stats.pvBreakdown.titreInvalide} (${stats.totalAmounts.pvTitreInvalide.toFixed(2)} €)\n`;
    body += `   Refus contrôle: ${stats.pvBreakdown.refusControle} (${stats.totalAmounts.pvRefusControle.toFixed(2)} €)\n`;
    body += `   Autre PV: ${stats.pvBreakdown.autre} (${stats.totalAmounts.pvAutre.toFixed(2)} €)\n`;
    body += `   ─────────────────────────────\n`;
    body += `   TOTAL: ${stats.pv}\n\n`;
    
    body += `🎫 TARIFS À BORD (ventes)\n`;
    body += `   STT 50€: ${stats.tarifsBord.stt50}\n`;
    body += `   STT 100€: ${stats.tarifsBord.stt100}\n`;
    body += `   RNV: ${stats.tarifsBord.rnv}\n`;
    body += `   Titre tiers: ${stats.tarifsBord.titreTiers}\n`;
    body += `   Date naissance: ${stats.tarifsBord.docNaissance}\n`;
    body += `   Autre: ${stats.tarifsBord.autre}\n`;
    body += `   ─────────────────────────────\n`;
    body += `   TOTAL: ${stats.totalTarifsBord}\n\n`;
    
    body += `🔍 CONTRÔLES D'IDENTITÉ (RI)\n`;
    body += `   RI Positive: ${stats.riPositive}\n`;
    body += `   RI Négative: ${stats.riNegative}\n`;
    body += `   ─────────────────────────────\n`;
    body += `   TOTAL: ${stats.riPositive + stats.riNegative}\n\n`;
  }
  
  body += `┌─────────────────────────────────────────┐\n`;
  body += `│         DÉTAIL DES CONTRÔLES            │\n`;
  body += `└─────────────────────────────────────────┘\n\n`;
  
  controls.forEach((control, index) => {
    const details = getControlDetails(control);
    const typeEmoji = control.location_type === 'train' ? '🚆' : control.location_type === 'gare' ? '🏢' : '🚉';
    
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `${index + 1}. ${typeEmoji} ${control.location_type.toUpperCase()} - ${details.date} à ${details.time}\n`;
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    if (control.location_type === 'train') {
      body += `   N° Train: ${details.trainNumber}\n`;
      body += `   Trajet: ${details.origin} → ${details.destination}\n`;
    } else {
      body += `   Lieu: ${details.location}\n`;
      if (control.platform_number) body += `   Quai: ${details.platformNumber}\n`;
    }
    
    body += `\n   👥 Voyageurs: ${details.passengers} | En règle: ${details.inRule}\n`;
    body += `   📊 Taux de fraude: ${details.fraudRateFormatted}\n\n`;
    
    body += `   💶 Tarifs contrôle:\n`;
    body += `      STT 50€: ${details.stt50} | STT 100€: ${details.stt100} | RNV: ${details.rnv}\n`;
    body += `      Titre tiers: ${details.titreTiers} | Date naiss.: ${details.docNaissance} | Autre: ${details.autreTarif}\n`;
    
    body += `\n   ⚠️ PV: ${details.pv}\n`;
    body += `      Absence: ${details.pvAbsenceTitre} | Invalide: ${details.pvTitreInvalide} | Refus: ${details.pvRefusControle} | Autre: ${details.pvAutre}\n`;
    
    body += `\n   🔍 RI: +${details.riPositive} / -${details.riNegative}\n`;
    
    if (details.notes) {
      body += `\n   📝 Notes: ${details.notes}\n`;
    }
    
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
