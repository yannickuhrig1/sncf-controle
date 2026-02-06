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
  const doc = new jsPDF({ orientation: 'portrait' });
  const stats = calculateMissionStats(mission.trains);
  const missionDate = new Date(mission.date);
  let pageNumber = 1;
  
  const addFooter = () => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `SNCF Contrôles - Mission Embarquement - Page ${pageNumber}`,
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
  doc.text('Mission Embarquement', 14, 28);
  
  // Status badge
  if (isCompleted) {
    doc.setFillColor(34, 139, 34);
    doc.roundedRect(170, 18, 25, 8, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('TERMINÉE', 182.5, 23, { align: 'center' });
  }
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gare: ${mission.stationName}`, 14, 38);
  doc.text(`Date: ${format(missionDate, 'dd/MM/yyyy', { locale: fr })}`, 14, 44);
  doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 14, 50);
  doc.text(`Total trains: ${stats.trainCount}`, 14, 56);

  let yPosition = 66;

  if (includeStats) {
    // Global statistics
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Statistiques globales', 14, yPosition);
    yPosition += 8;

    const globalColor = getThresholdColor(stats.globalFraudRate);
    const colorRGB = getColorRGB(globalColor);

    const statsData = [
      ['Métrique', 'Valeur'],
      ['Personnes contrôlées', stats.totalControlled.toString()],
      ['Personnes refoulées', stats.totalRefused.toString()],
      ['Taux de fraude OP', `${stats.globalFraudRate.toFixed(1)}%`],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [statsData[0]],
      body: statsData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 139], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 100 },
      tableWidth: 80,
      didParseCell: function(data) {
        if (data.row.index === 2 && data.column.index === 1) {
          data.cell.styles.textColor = colorRGB;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // Incidents (on the right)
    const incidentsY = yPosition;
    doc.text('Incidents signalés', 110, incidentsY);

    const incidentsData = [
      ['Type', 'Nombre'],
      ['Présence police', stats.incidentCounts.policePresence.toString()],
      ['Traversée de voies', stats.incidentCounts.trackCrossing.toString()],
      ['Franchissement ligne', stats.incidentCounts.controlLineCrossing.toString()],
    ];

    autoTable(doc, {
      startY: incidentsY + 6,
      head: [incidentsData[0]],
      body: incidentsData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [178, 34, 34], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 110, right: 14 },
      tableWidth: 75,
    });

    yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Trains detail
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Détail des trains', 14, yPosition);
  yPosition += 8;

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
      `${train.origin || mission.stationName} → ${train.destination || '-'}`,
      train.controlled.toString(),
      train.refused.toString(),
      `${trainFraudRate.toFixed(1)}%`,
      incidents,
    ];
  });

  autoTable(doc, {
    startY: yPosition,
    head: [['N° Train', 'Départ', 'Quai', 'Trajet', 'Ctrl.', 'Ref.', 'Fraude', 'Inc.']],
    body: trainTableData,
    theme: 'striped',
    headStyles: { fillColor: [0, 0, 139], fontSize: 8, cellPadding: 2 },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 55 },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 15, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 6) {
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

  // Train comments
  const trainsWithComments = mission.trains.filter(t => t.comment && t.comment.trim());
  if (trainsWithComments.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(11);
    doc.text('Commentaires par train', 14, yPosition);
    yPosition += 6;
    
    const commentsData = trainsWithComments.map(t => [
      `Train ${t.trainNumber}`,
      t.comment
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Train', 'Commentaire']],
      body: commentsData,
      theme: 'striped',
      headStyles: { fillColor: [70, 130, 180], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: function() {
        addFooter();
        pageNumber++;
      }
    });
    
    yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Global comment
  if (mission.globalComment && mission.globalComment.trim()) {
    if (yPosition > 260) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(11);
    doc.text('Commentaire global mission', 14, yPosition);
    yPosition += 6;
    
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    
    const splitComment = doc.splitTextToSize(mission.globalComment, 180);
    doc.text(splitComment, 14, yPosition);
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
    green: '#22c55e',
    yellow: '#f59e0b',
    red: '#dc2626',
  };

  const getTrainColor = (train: EmbarkmentTrain) => {
    const rate = train.controlled > 0 ? (train.refused / train.controlled) * 100 : 0;
    return colorMap[getThresholdColor(rate)];
  };

  const trainRows = mission.trains.map(train => {
    const fraudRate = train.controlled > 0 ? (train.refused / train.controlled) * 100 : 0;
    const incidents = [
      train.policePresence ? '👮 Police' : '',
      train.trackCrossing ? '🚶 Voies' : '',
      train.controlLineCrossing ? '⚠️ Ligne' : '',
    ].filter(Boolean).join(', ') || '-';
    
    return `
      <tr>
        <td><strong>${train.trainNumber}</strong></td>
        <td>${train.departureTime || '-'}</td>
        <td>${train.platform || '-'}</td>
        <td>${train.origin || mission.stationName} → ${train.destination || '-'}</td>
        <td class="center">${train.controlled}</td>
        <td class="center">${train.refused}</td>
        <td class="center" style="color: ${getTrainColor(train)}; font-weight: bold;">
          ${fraudRate.toFixed(1)}%
        </td>
        <td>${incidents}</td>
        <td>${train.comment || '-'}</td>
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
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header { 
      border-bottom: 3px solid #00008B;
      padding-bottom: 15px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    h1 { color: #00008B; font-size: 24px; margin-bottom: 5px; }
    h2 { color: #00008B; font-size: 18px; margin-bottom: 5px; }
    .subtitle { color: #666; font-size: 16px; }
    .meta { color: #888; font-size: 14px; margin-top: 10px; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      color: white;
    }
    .badge-completed { background: #22c55e; }
    .badge-active { background: #3b82f6; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 25px;
    }
    .stat-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { color: #666; font-size: 13px; margin-top: 4px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 14px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px 8px;
      text-align: left;
    }
    th {
      background: #00008B;
      color: white;
      font-weight: 600;
    }
    tr:nth-child(even) { background: #f8f9fa; }
    tr:hover { background: #f0f0f0; }
    .center { text-align: center; }
    .section { margin-bottom: 25px; }
    .comment-box {
      background: #f0f4f8;
      border-left: 4px solid #00008B;
      padding: 15px;
      margin-top: 10px;
      border-radius: 0 8px 8px 0;
    }
    .incidents-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 15px;
    }
    .incident-item {
      background: #fff3cd;
      padding: 10px;
      border-radius: 6px;
      text-align: center;
    }
    .incident-count { font-size: 20px; font-weight: bold; color: #856404; }
    .incident-label { font-size: 12px; color: #856404; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>🚂 SNCF Contrôles</h1>
      <div class="subtitle">Mission Embarquement</div>
      <div class="meta">
        <strong>Gare:</strong> ${mission.stationName}<br>
        <strong>Date:</strong> ${format(missionDate, 'dd MMMM yyyy', { locale: fr })}<br>
        <strong>Généré le:</strong> ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}
      </div>
    </div>
    <div>
      <span class="badge ${isCompleted ? 'badge-completed' : 'badge-active'}">
        ${isCompleted ? '✓ TERMINÉE' : 'EN COURS'}
      </span>
    </div>
  </div>

  <div class="section">
    <h2>📊 Statistiques globales</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.trainCount}</div>
        <div class="stat-label">Trains contrôlés</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalControlled}</div>
        <div class="stat-label">Personnes contrôlées</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #dc2626;">${stats.totalRefused}</div>
        <div class="stat-label">Personnes refoulées</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: ${colorMap[globalColor]};">${stats.globalFraudRate.toFixed(1)}%</div>
        <div class="stat-label">Taux de fraude OP</div>
      </div>
    </div>
    
    <h3>⚠️ Incidents signalés</h3>
    <div class="incidents-grid">
      <div class="incident-item">
        <div class="incident-count">${stats.incidentCounts.policePresence}</div>
        <div class="incident-label">👮 Présence police</div>
      </div>
      <div class="incident-item">
        <div class="incident-count">${stats.incidentCounts.trackCrossing}</div>
        <div class="incident-label">🚶 Traversée voies</div>
      </div>
      <div class="incident-item">
        <div class="incident-count">${stats.incidentCounts.controlLineCrossing}</div>
        <div class="incident-label">⚠️ Franchissement ligne</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>🚆 Détail des trains</h2>
    <table>
      <thead>
        <tr>
          <th>N° Train</th>
          <th>Départ</th>
          <th>Quai</th>
          <th>Trajet</th>
          <th class="center">Contrôlés</th>
          <th class="center">Refoulés</th>
          <th class="center">Fraude</th>
          <th>Incidents</th>
          <th>Commentaire</th>
        </tr>
      </thead>
      <tbody>
        ${trainRows}
      </tbody>
    </table>
  </div>

  ${mission.globalComment ? `
  <div class="section">
    <h2>💬 Commentaire global mission</h2>
    <div class="comment-box">
      ${mission.globalComment.replace(/\n/g, '<br>')}
    </div>
  </div>
  ` : ''}

  <script>
    // Allow printing
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        window.print();
      }
    });
  </script>
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
