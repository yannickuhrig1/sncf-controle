import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { EmbarkmentTrain, EmbarkmentMissionData } from '@/components/controls/EmbarkmentControl';
import { getFraudThresholds } from './stats';

export interface EmbarkmentExportOptions {
  mission: EmbarkmentMissionData;
  includeStats?: boolean;
  isCompleted?: boolean;
}

function getThresholdColor(rate: number): 'green' | 'yellow' | 'red' {
  const thresholds = getFraudThresholds();
  if (rate < thresholds.low) return 'green';
  if (rate < thresholds.medium) return 'yellow';
  return 'red';
}

function getColorRGB(color: 'green' | 'yellow' | 'red'): [number, number, number] {
  switch (color) {
    case 'green': return [34, 139, 34];
    case 'yellow': return [255, 165, 0];
    case 'red': return [178, 34, 34];
  }
}

function calculateMissionStats(trains: EmbarkmentTrain[]) {
  const totalControlled = trains.reduce((sum, t) => sum + t.controlled, 0);
  const totalRefused = trains.reduce((sum, t) => sum + t.refused, 0);
  const globalFraudRate = totalControlled > 0 ? (totalRefused / totalControlled) * 100 : 0;
  
  const incidentCounts = {
    policePresence: trains.filter(t => t.policePresence).length,
    trackCrossing: trains.filter(t => t.trackCrossing).length,
    controlLineCrossing: trains.filter(t => t.controlLineCrossing).length,
  };
  
  return {
    totalControlled,
    totalRefused,
    globalFraudRate,
    incidentCounts,
    trainCount: trains.length,
  };
}

export function exportEmbarkmentToPDF({ mission, includeStats = true, isCompleted = false }: EmbarkmentExportOptions): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape' });
  const stats = calculateMissionStats(mission.trains);
  const missionDate = new Date(mission.date);
  let pageNumber = 1;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const addFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `SNCF Contrôles - Mission Embarquement - ${mission.stationName} - Page ${pageNumber}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  };
  
  // Header with dark blue background
  doc.setFillColor(0, 0, 139);
  doc.rect(0, 0, pageWidth, 28, 'F');
  
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('🚂 SNCF Contrôles - Mission Embarquement', 14, 16);
  
  // Status badge
  if (isCompleted) {
    doc.setFillColor(34, 139, 34);
    doc.roundedRect(pageWidth - 45, 8, 35, 10, 3, 3, 'F');
    doc.setFontSize(9);
    doc.text('✓ TERMINÉE', pageWidth - 27.5, 14.5, { align: 'center' });
  } else {
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(pageWidth - 45, 8, 35, 10, 3, 3, 'F');
    doc.setFontSize(9);
    doc.text('EN COURS', pageWidth - 27.5, 14.5, { align: 'center' });
  }
  
  // Sub-header info
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Gare: ${mission.stationName}  |  Date: ${format(missionDate, 'EEEE dd MMMM yyyy', { locale: fr })}  |  ${stats.trainCount} train(s)`, 14, 38);
  doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth - 14, 38, { align: 'right' });

  let yPosition = 48;

  if (includeStats) {
    // Global statistics in compact cards side by side
    const cardWidth = 55;
    const cardHeight = 22;
    const gap = 8;
    const startX = 14;
    
    const globalColor = getThresholdColor(stats.globalFraudRate);
    const colorRGB = getColorRGB(globalColor);
    
    // Card 1: Trains
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(startX, yPosition, cardWidth, cardHeight, 3, 3, 'F');
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 139);
    doc.text(stats.trainCount.toString(), startX + cardWidth / 2, yPosition + 12, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Trains', startX + cardWidth / 2, yPosition + 18, { align: 'center' });
    
    // Card 2: Controlled
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(startX + cardWidth + gap, yPosition, cardWidth, cardHeight, 3, 3, 'F');
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 139);
    doc.text(stats.totalControlled.toString(), startX + cardWidth + gap + cardWidth / 2, yPosition + 12, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Contrôlés', startX + cardWidth + gap + cardWidth / 2, yPosition + 18, { align: 'center' });
    
    // Card 3: Refused
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(startX + 2 * (cardWidth + gap), yPosition, cardWidth, cardHeight, 3, 3, 'F');
    doc.setFontSize(16);
    doc.setTextColor(185, 28, 28);
    doc.text(stats.totalRefused.toString(), startX + 2 * (cardWidth + gap) + cardWidth / 2, yPosition + 12, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Refoulés', startX + 2 * (cardWidth + gap) + cardWidth / 2, yPosition + 18, { align: 'center' });
    
    // Card 4: Fraud rate
    const fraudBgColor = globalColor === 'green' ? [220, 252, 231] : globalColor === 'yellow' ? [254, 249, 195] : [254, 226, 226];
    doc.setFillColor(fraudBgColor[0], fraudBgColor[1], fraudBgColor[2]);
    doc.roundedRect(startX + 3 * (cardWidth + gap), yPosition, cardWidth, cardHeight, 3, 3, 'F');
    doc.setFontSize(16);
    doc.setTextColor(colorRGB[0], colorRGB[1], colorRGB[2]);
    doc.text(`${stats.globalFraudRate.toFixed(1)}%`, startX + 3 * (cardWidth + gap) + cardWidth / 2, yPosition + 12, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Taux fraude', startX + 3 * (cardWidth + gap) + cardWidth / 2, yPosition + 18, { align: 'center' });
    
    // Incidents (on the right)
    const incidentsX = startX + 4 * (cardWidth + gap) + 5;
    const incidentCardWidth = 40;
    const incidentCardHeight = 22;
    const incidentGap = 5;
    
    if (stats.incidentCounts.policePresence > 0 || stats.incidentCounts.trackCrossing > 0 || stats.incidentCounts.controlLineCrossing > 0) {
      doc.setFillColor(255, 243, 205);
      doc.roundedRect(incidentsX, yPosition, incidentCardWidth, incidentCardHeight, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setTextColor(133, 100, 4);
      doc.text(`👮 ${stats.incidentCounts.policePresence}`, incidentsX + incidentCardWidth / 2, yPosition + 14, { align: 'center' });
      
      doc.roundedRect(incidentsX + incidentCardWidth + incidentGap, yPosition, incidentCardWidth, incidentCardHeight, 3, 3, 'F');
      doc.text(`🚶 ${stats.incidentCounts.trackCrossing}`, incidentsX + incidentCardWidth + incidentGap + incidentCardWidth / 2, yPosition + 14, { align: 'center' });
      
      doc.roundedRect(incidentsX + 2 * (incidentCardWidth + incidentGap), yPosition, incidentCardWidth, incidentCardHeight, 3, 3, 'F');
      doc.text(`⚠️ ${stats.incidentCounts.controlLineCrossing}`, incidentsX + 2 * (incidentCardWidth + incidentGap) + incidentCardWidth / 2, yPosition + 14, { align: 'center' });
    }
    
    yPosition += cardHeight + 12;
  }

  // Trains detail table
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 139);
  doc.text('📋 Détail des trains', 14, yPosition);
  yPosition += 6;

  const trainTableData = mission.trains.map(train => {
    const trainFraudRate = train.controlled > 0 ? (train.refused / train.controlled) * 100 : 0;
    const incidents = [
      train.policePresence ? '👮' : '',
      train.trackCrossing ? '🚶' : '',
      train.controlLineCrossing ? '⚠️' : '',
    ].filter(Boolean).join(' ') || '-';
    
    return [
      train.trainNumber,
      train.departureTime || '-',
      train.platform || '-',
      train.origin || mission.stationName,
      train.destination || '-',
      train.controlled.toString(),
      train.refused.toString(),
      `${trainFraudRate.toFixed(1)}%`,
      incidents,
      train.comment ? (train.comment.length > 40 ? train.comment.substring(0, 40) + '...' : train.comment) : '-',
    ];
  });

  autoTable(doc, {
    startY: yPosition,
    head: [['N° Train', 'Départ', 'Quai', 'Origine', 'Destination', 'Ctrl.', 'Ref.', 'Fraude', 'Inc.', 'Commentaire']],
    body: trainTableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [0, 0, 139], 
      fontSize: 9, 
      cellPadding: 3,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 35 },
      4: { cellWidth: 35 },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 18, halign: 'center' },
      8: { cellWidth: 18, halign: 'center' },
      9: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 7) {
        const train = mission.trains[data.row.index];
        if (train) {
          const rate = train.controlled > 0 ? (train.refused / train.controlled) * 100 : 0;
          const color = getThresholdColor(rate);
          data.cell.styles.textColor = getColorRGB(color);
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: function() {
      addFooter();
      pageNumber++;
    }
  });

  yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Global comment if exists
  if (mission.globalComment && mission.globalComment.trim()) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFillColor(240, 244, 248);
    doc.roundedRect(14, yPosition, pageWidth - 28, 30, 3, 3, 'F');
    doc.setDrawColor(0, 0, 139);
    doc.setLineWidth(0.5);
    doc.line(14, yPosition, 14, yPosition + 30);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 139);
    doc.text('💬 Commentaire mission', 20, yPosition + 8);
    
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const splitComment = doc.splitTextToSize(mission.globalComment, pageWidth - 40);
    doc.text(splitComment.slice(0, 2), 20, yPosition + 16);
  }

  addFooter();
  return doc;
}

export function downloadEmbarkmentPDF(mission: EmbarkmentMissionData, isCompleted = false) {
  const doc = exportEmbarkmentToPDF({ mission, includeStats: true, isCompleted });
  const missionDate = new Date(mission.date);
  const filename = `embarquement-${mission.stationName.replace(/\s+/g, '-')}-${format(missionDate, 'yyyy-MM-dd')}.pdf`;
  
  try {
    doc.save(filename);
  } catch (error) {
    console.error('PDF save error:', error);
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

export function generateEmbarkmentHTML(mission: EmbarkmentMissionData, isCompleted = false): string {
  const stats = calculateMissionStats(mission.trains);
  const missionDate = new Date(mission.date);
  const globalColor = getThresholdColor(stats.globalFraudRate);
  
  const colorMap = {
    green: '#16a34a',
    yellow: '#d97706',
    red: '#dc2626',
  };
  
  const bgColorMap = {
    green: '#dcfce7',
    yellow: '#fef3c7',
    red: '#fee2e2',
  };

  const getTrainColor = (train: EmbarkmentTrain) => {
    const rate = train.controlled > 0 ? (train.refused / train.controlled) * 100 : 0;
    return colorMap[getThresholdColor(rate)];
  };

  const trainRows = mission.trains.map(train => {
    const fraudRate = train.controlled > 0 ? (train.refused / train.controlled) * 100 : 0;
    const incidents = [
      train.policePresence ? '<span class="incident-badge">👮</span>' : '',
      train.trackCrossing ? '<span class="incident-badge">🚶</span>' : '',
      train.controlLineCrossing ? '<span class="incident-badge">⚠️</span>' : '',
    ].filter(Boolean).join(' ') || '<span class="no-incident">-</span>';
    
    return `
      <tr>
        <td class="train-number">${train.trainNumber}</td>
        <td class="center">${train.departureTime || '-'}</td>
        <td class="center">${train.platform || '-'}</td>
        <td>${train.origin || mission.stationName}</td>
        <td>${train.destination || '-'}</td>
        <td class="center num">${train.controlled}</td>
        <td class="center num refused">${train.refused}</td>
        <td class="center fraud-rate" style="color: ${getTrainColor(train)};">
          ${fraudRate.toFixed(1)}%
        </td>
        <td class="center">${incidents}</td>
        <td class="comment">${train.comment || '-'}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mission Embarquement - ${mission.stationName} - ${format(missionDate, 'dd/MM/yyyy', { locale: fr })}</title>
  <style>
    :root {
      --primary: #00008B;
      --primary-light: #4169E1;
      --success: #16a34a;
      --warning: #d97706;
      --danger: #dc2626;
      --gray-50: #f8fafc;
      --gray-100: #f1f5f9;
      --gray-200: #e2e8f0;
      --gray-400: #94a3b8;
      --gray-600: #475569;
      --gray-800: #1e293b;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      line-height: 1.5;
      color: var(--gray-800);
      background: var(--gray-50);
      min-height: 100vh;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 16px;
    }
    
    /* Header */
    .header { 
      background: linear-gradient(135deg, var(--primary), var(--primary-light));
      color: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .header-content h1 { 
      font-size: clamp(18px, 4vw, 26px);
      font-weight: 700;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .header-subtitle {
      font-size: clamp(14px, 2.5vw, 16px);
      opacity: 0.9;
    }
    
    .header-meta {
      font-size: clamp(12px, 2vw, 14px);
      opacity: 0.85;
      margin-top: 8px;
    }
    
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
    }
    
    .badge-completed { background: rgba(22, 163, 74, 0.9); }
    .badge-active { background: rgba(59, 130, 246, 0.9); }
    
    /* Stats grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid var(--gray-200);
    }
    
    .stat-value { 
      font-size: clamp(24px, 5vw, 36px);
      font-weight: 700;
      line-height: 1.2;
    }
    
    .stat-label { 
      color: var(--gray-600);
      font-size: clamp(11px, 2vw, 13px);
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .stat-card.fraud { background: ${bgColorMap[globalColor]}; }
    .stat-card.fraud .stat-value { color: ${colorMap[globalColor]}; }
    
    .stat-card.refused .stat-value { color: var(--danger); }
    
    /* Incidents section */
    .incidents-section {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    
    .incidents-title {
      font-size: 14px;
      font-weight: 600;
      color: #92400e;
      margin-bottom: 12px;
    }
    
    .incidents-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    
    .incident-item {
      display: flex;
      align-items: center;
      gap: 8px;
      background: white;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 14px;
    }
    
    .incident-count {
      font-weight: 700;
      font-size: 18px;
      color: #92400e;
    }
    
    .incident-label {
      color: var(--gray-600);
      font-size: 13px;
    }
    
    /* Table section */
    .section {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid var(--gray-200);
      overflow: hidden;
      margin-bottom: 24px;
    }
    
    .section-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--gray-200);
      background: var(--gray-50);
    }
    
    .section-title {
      font-size: clamp(14px, 2.5vw, 16px);
      font-weight: 600;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .table-wrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: clamp(12px, 2vw, 14px);
      min-width: 800px;
    }
    
    th, td {
      padding: 12px 10px;
      text-align: left;
      border-bottom: 1px solid var(--gray-200);
    }
    
    th {
      background: var(--primary);
      color: white;
      font-weight: 600;
      font-size: clamp(11px, 1.8vw, 13px);
      white-space: nowrap;
      position: sticky;
      top: 0;
    }
    
    tr:nth-child(even) { background: var(--gray-50); }
    tr:hover { background: var(--gray-100); }
    
    .center { text-align: center; }
    
    .train-number { 
      font-weight: 700;
      color: var(--primary);
    }
    
    .num { font-family: 'SF Mono', Monaco, monospace; }
    
    .refused { color: var(--danger); font-weight: 600; }
    
    .fraud-rate { font-weight: 700; }
    
    .incident-badge {
      display: inline-block;
      padding: 2px 6px;
      background: #fef3c7;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .no-incident { color: var(--gray-400); }
    
    .comment {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--gray-600);
      font-size: 12px;
    }
    
    /* Comment box */
    .comment-box {
      background: var(--gray-50);
      border-left: 4px solid var(--primary);
      padding: 16px 20px;
      margin: 16px;
      border-radius: 0 8px 8px 0;
      font-size: 14px;
      color: var(--gray-600);
      line-height: 1.6;
    }
    
    /* Footer */
    .footer {
      text-align: center;
      padding: 16px;
      color: var(--gray-400);
      font-size: 12px;
    }
    
    /* Print styles */
    @media print {
      body { background: white; }
      .container { padding: 0; max-width: none; }
      .header { border-radius: 0; margin-bottom: 10px; }
      .section { box-shadow: none; border-radius: 0; }
      .no-print { display: none; }
      table { min-width: auto; }
    }
    
    /* Mobile optimizations */
    @media (max-width: 640px) {
      .container { padding: 12px; }
      .header { padding: 16px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .stat-card { padding: 12px; }
      th, td { padding: 8px 6px; }
    }
    
    /* Tablet optimizations */
    @media (min-width: 641px) and (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(4, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-content">
        <h1>🚂 Mission Embarquement</h1>
        <div class="header-subtitle">${mission.stationName}</div>
        <div class="header-meta">
          ${format(missionDate, 'EEEE dd MMMM yyyy', { locale: fr })} • ${stats.trainCount} train(s) contrôlé(s)
        </div>
      </div>
      <span class="badge ${isCompleted ? 'badge-completed' : 'badge-active'}">
        ${isCompleted ? '✓ Terminée' : '○ En cours'}
      </span>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.trainCount}</div>
        <div class="stat-label">Trains</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalControlled}</div>
        <div class="stat-label">Contrôlés</div>
      </div>
      <div class="stat-card refused">
        <div class="stat-value">${stats.totalRefused}</div>
        <div class="stat-label">Refoulés</div>
      </div>
      <div class="stat-card fraud">
        <div class="stat-value">${stats.globalFraudRate.toFixed(1)}%</div>
        <div class="stat-label">Taux fraude</div>
      </div>
    </div>
    
    ${(stats.incidentCounts.policePresence > 0 || stats.incidentCounts.trackCrossing > 0 || stats.incidentCounts.controlLineCrossing > 0) ? `
    <div class="incidents-section">
      <div class="incidents-title">⚠️ Incidents signalés</div>
      <div class="incidents-grid">
        <div class="incident-item">
          <span class="incident-count">${stats.incidentCounts.policePresence}</span>
          <span class="incident-label">👮 Présence police</span>
        </div>
        <div class="incident-item">
          <span class="incident-count">${stats.incidentCounts.trackCrossing}</span>
          <span class="incident-label">🚶 Traversée voies</span>
        </div>
        <div class="incident-item">
          <span class="incident-count">${stats.incidentCounts.controlLineCrossing}</span>
          <span class="incident-label">⚠️ Franchissement</span>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-header">
        <h2 class="section-title">📋 Détail des trains</h2>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>N° Train</th>
              <th class="center">Départ</th>
              <th class="center">Quai</th>
              <th>Origine</th>
              <th>Destination</th>
              <th class="center">Contrôlés</th>
              <th class="center">Refoulés</th>
              <th class="center">Fraude</th>
              <th class="center">Incidents</th>
              <th>Commentaire</th>
            </tr>
          </thead>
          <tbody>
            ${trainRows}
          </tbody>
        </table>
      </div>
    </div>

    ${mission.globalComment ? `
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">💬 Commentaire mission</h2>
      </div>
      <div class="comment-box">
        ${mission.globalComment.replace(/\n/g, '<br>')}
      </div>
    </div>
    ` : ''}

    <div class="footer">
      SNCF Contrôles • Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function downloadEmbarkmentHTML(mission: EmbarkmentMissionData, isCompleted = false) {
  const html = generateEmbarkmentHTML(mission, isCompleted);
  const missionDate = new Date(mission.date);
  const filename = `embarquement-${mission.stationName.replace(/\s+/g, '-')}-${format(missionDate, 'yyyy-MM-dd')}.html`;
  
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function openEmbarkmentHTMLPreview(mission: EmbarkmentMissionData, isCompleted = false) {
  const html = generateEmbarkmentHTML(mission, isCompleted);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export interface GroupedMissionExport {
  mission: EmbarkmentMissionData;
  isCompleted: boolean;
}

export function downloadGroupedEmbarkmentPDF(missions: GroupedMissionExport[]) {
  if (missions.length === 0) return;
  
  const jsPDFModule = jsPDF;
  const doc = new jsPDFModule({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let pageNumber = 1;

  const addFooter = (label: string) => {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `SNCF Contrôles - Export groupé - ${label} - Page ${pageNumber}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  };

  // Cover page
  doc.setFillColor(0, 0, 139);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('🚂 SNCF Contrôles - Export Groupé', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text(`${missions.length} mission(s) embarquement`, pageWidth / 2, 32, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, 52, { align: 'center' });

  // Summary table
  let yPos = 65;
  const summaryData = missions.map(({ mission, isCompleted }) => {
    const stats = calculateMissionStats(mission.trains);
    return [
      mission.stationName,
      format(new Date(mission.date), 'dd/MM/yyyy', { locale: fr }),
      stats.trainCount.toString(),
      stats.totalControlled.toString(),
      stats.totalRefused.toString(),
      `${stats.globalFraudRate.toFixed(1)}%`,
      isCompleted ? '✓ Terminée' : 'En cours',
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Gare', 'Date', 'Trains', 'Contrôlés', 'Refoulés', 'Fraude', 'Statut']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 139], fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 20, right: 20 },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 5) {
        const m = missions[data.row.index];
        if (m) {
          const stats = calculateMissionStats(m.mission.trains);
          const color = getThresholdColor(stats.globalFraudRate);
          data.cell.styles.textColor = getColorRGB(color);
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  addFooter('Synthèse');
  pageNumber++;

  // Each mission on its own page(s)
  missions.forEach(({ mission, isCompleted }) => {
    doc.addPage();
    const missionDoc = exportEmbarkmentToPDF({ mission, includeStats: true, isCompleted });
    
    // Instead of merging, we re-render inline
    const stats = calculateMissionStats(mission.trains);
    const missionDate = new Date(mission.date);

    // Header
    doc.setFillColor(0, 0, 139);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(`🚂 ${mission.stationName}`, 14, 16);
    
    if (isCompleted) {
      doc.setFillColor(34, 139, 34);
      doc.roundedRect(pageWidth - 45, 8, 35, 10, 3, 3, 'F');
      doc.setFontSize(9);
      doc.text('✓ TERMINÉE', pageWidth - 27.5, 14.5, { align: 'center' });
    }

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Date: ${format(missionDate, 'EEEE dd MMMM yyyy', { locale: fr })}  |  ${stats.trainCount} train(s)`, 14, 38);

    let y = 48;
    // Stats cards
    const cardW = 55, cardH = 22, gap = 8;
    const globalColor = getThresholdColor(stats.globalFraudRate);
    const colorRGB = getColorRGB(globalColor);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, cardW, cardH, 3, 3, 'F');
    doc.setFontSize(16); doc.setTextColor(0, 0, 139);
    doc.text(stats.trainCount.toString(), 14 + cardW/2, y+12, { align: 'center' });
    doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text('Trains', 14 + cardW/2, y+18, { align: 'center' });

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14 + cardW + gap, y, cardW, cardH, 3, 3, 'F');
    doc.setFontSize(16); doc.setTextColor(0, 0, 139);
    doc.text(stats.totalControlled.toString(), 14 + cardW + gap + cardW/2, y+12, { align: 'center' });
    doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text('Contrôlés', 14 + cardW + gap + cardW/2, y+18, { align: 'center' });

    doc.setFillColor(254, 242, 242);
    doc.roundedRect(14 + 2*(cardW+gap), y, cardW, cardH, 3, 3, 'F');
    doc.setFontSize(16); doc.setTextColor(185, 28, 28);
    doc.text(stats.totalRefused.toString(), 14 + 2*(cardW+gap) + cardW/2, y+12, { align: 'center' });
    doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text('Refoulés', 14 + 2*(cardW+gap) + cardW/2, y+18, { align: 'center' });

    const fraudBg = globalColor === 'green' ? [220,252,231] : globalColor === 'yellow' ? [254,249,195] : [254,226,226];
    doc.setFillColor(fraudBg[0], fraudBg[1], fraudBg[2]);
    doc.roundedRect(14 + 3*(cardW+gap), y, cardW, cardH, 3, 3, 'F');
    doc.setFontSize(16); doc.setTextColor(colorRGB[0], colorRGB[1], colorRGB[2]);
    doc.text(`${stats.globalFraudRate.toFixed(1)}%`, 14 + 3*(cardW+gap) + cardW/2, y+12, { align: 'center' });
    doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text('Taux fraude', 14 + 3*(cardW+gap) + cardW/2, y+18, { align: 'center' });

    y += cardH + 12;

    // Trains table
    const trainData = mission.trains.map(train => {
      const rate = train.controlled > 0 ? (train.refused / train.controlled) * 100 : 0;
      const incidents = [
        train.policePresence ? '👮' : '',
        train.trackCrossing ? '🚶' : '',
        train.controlLineCrossing ? '⚠️' : '',
      ].filter(Boolean).join(' ') || '-';
      return [
        train.trainNumber,
        train.departureTime || '-',
        train.platform || '-',
        train.origin || mission.stationName,
        train.destination || '-',
        train.controlled.toString(),
        train.refused.toString(),
        `${rate.toFixed(1)}%`,
        incidents,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['N° Train', 'Départ', 'Quai', 'Origine', 'Dest.', 'Ctrl.', 'Ref.', 'Fraude', 'Inc.']],
      body: trainData,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 139], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 7) {
          const train = mission.trains[data.row.index];
          if (train) {
            const rate = train.controlled > 0 ? (train.refused / train.controlled) * 100 : 0;
            data.cell.styles.textColor = getColorRGB(getThresholdColor(rate));
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    addFooter(mission.stationName);
    pageNumber++;
  });

  const filename = `export-embarquement-groupe-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  try {
    doc.save(filename);
  } catch {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
