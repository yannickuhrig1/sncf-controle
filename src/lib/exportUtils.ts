import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';
import { calculateStats, formatFraudRate } from './stats';

type Control = Database['public']['Tables']['controls']['Row'];

// Extend jsPDF types for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
  }
}

export interface ExportOptions {
  controls: Control[];
  title: string;
  dateRange: string;
  includeStats: boolean;
}

function getControlDetails(control: Control) {
  return {
    date: format(new Date(control.control_date), 'dd/MM/yyyy', { locale: fr }),
    time: control.control_time.slice(0, 5),
    location: control.location,
    trainNumber: control.train_number || '-',
    origin: control.origin || '-',
    destination: control.destination || '-',
    passengers: control.nb_passagers,
    inRule: control.nb_en_regle,
    tarifsControle: control.tarifs_controle,
    pv: control.pv,
    stt50: control.stt_50,
    stt100: control.stt_100,
    rnv: control.rnv,
    riPositive: control.ri_positive,
    riNegative: control.ri_negative,
    fraudRate: control.nb_passagers > 0 
      ? (((control.tarifs_controle + control.pv) / control.nb_passagers) * 100).toFixed(2) + '%'
      : '0%',
  };
}

export function exportToPDF({ controls, title, dateRange, includeStats }: ExportOptions) {
  const doc = new jsPDF();
  const stats = calculateStats(controls);
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 139); // SNCF blue
  doc.text('SNCF Contrôles - Rapport', 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(title, 14, 30);
  doc.text(`Période: ${dateRange}`, 14, 38);
  doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 14, 46);

  let yPosition = 56;

  // Statistics summary
  if (includeStats) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Résumé statistique', 14, yPosition);
    yPosition += 10;

    const statsData = [
      ['Total contrôles', controls.length.toString()],
      ['Total voyageurs', stats.totalPassengers.toString()],
      ['En règle', stats.passengersInRule.toString()],
      ['Taux de fraude', formatFraudRate(stats.fraudRate)],
      ['Tarifs contrôle', stats.tarifsControle.toString()],
      ['PV', stats.pv.toString()],
      ['STT 50%', stats.stt50.toString()],
      ['STT 100%', stats.stt100.toString()],
      ['RNV', stats.rnv.toString()],
      ['RI Positive', stats.riPositive.toString()],
      ['RI Négative', stats.riNegative.toString()],
    ];

    doc.autoTable({
      startY: yPosition,
      head: [['Métrique', 'Valeur']],
      body: statsData,
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 139] },
      margin: { left: 14 },
    });

    yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Controls detail table
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Détail des contrôles', 14, yPosition);
  yPosition += 10;

  const tableData = controls.map(control => {
    const details = getControlDetails(control);
    return [
      details.date,
      details.time,
      details.trainNumber,
      `${details.origin} → ${details.destination}`,
      details.passengers.toString(),
      details.inRule.toString(),
      details.stt50.toString(),
      details.stt100.toString(),
      details.pv.toString(),
      details.fraudRate,
    ];
  });

  doc.autoTable({
    startY: yPosition,
    head: [['Date', 'Heure', 'Train', 'Trajet', 'Voy.', 'OK', 'STT50', 'STT100', 'PV', 'Fraude']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [0, 0, 139], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 14 },
  });

  doc.save(`controles-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportToHTML({ controls, title, dateRange, includeStats }: ExportOptions): string {
  const stats = calculateStats(controls);
  
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #00008B; border-bottom: 3px solid #00008B; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; }
    .meta { color: #666; margin-bottom: 20px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #00008B; }
    .stat-value { font-size: 24px; font-weight: bold; color: #00008B; }
    .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #00008B; color: white; padding: 12px 8px; text-align: left; font-size: 12px; }
    td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
    tr:hover { background: #f5f5f5; }
    .fraud-high { color: #dc2626; font-weight: bold; }
    .fraud-medium { color: #f59e0b; }
    .fraud-low { color: #16a34a; }
    .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚂 SNCF Contrôles - Rapport</h1>
    <div class="meta">
      <p><strong>${title}</strong></p>
      <p>Période: ${dateRange}</p>
      <p>Généré le: ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
    </div>
    
    ${includeStats ? `
    <h2>📊 Résumé statistique</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${controls.length}</div>
        <div class="stat-label">Contrôles</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalPassengers}</div>
        <div class="stat-label">Voyageurs</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.passengersInRule}</div>
        <div class="stat-label">En règle</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatFraudRate(stats.fraudRate)}</div>
        <div class="stat-label">Taux de fraude</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.tarifsControle}</div>
        <div class="stat-label">Tarifs contrôle</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.pv}</div>
        <div class="stat-label">PV</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.stt50}</div>
        <div class="stat-label">STT 50%</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.stt100}</div>
        <div class="stat-label">STT 100%</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.rnv}</div>
        <div class="stat-label">RNV</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.riPositive}/${stats.riNegative}</div>
        <div class="stat-label">RI (+/-)</div>
      </div>
    </div>
    ` : ''}
    
    <h2>📋 Détail des contrôles</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Heure</th>
          <th>N° Train</th>
          <th>Trajet</th>
          <th>Voyageurs</th>
          <th>En règle</th>
          <th>STT 50%</th>
          <th>STT 100%</th>
          <th>RNV</th>
          <th>PV</th>
          <th>RI +/-</th>
          <th>Fraude</th>
        </tr>
      </thead>
      <tbody>
        ${controls.map(control => {
          const details = getControlDetails(control);
          const fraudValue = parseFloat(details.fraudRate);
          const fraudClass = fraudValue > 10 ? 'fraud-high' : fraudValue > 5 ? 'fraud-medium' : 'fraud-low';
          return `
          <tr>
            <td>${details.date}</td>
            <td>${details.time}</td>
            <td>${details.trainNumber}</td>
            <td>${details.origin} → ${details.destination}</td>
            <td>${details.passengers}</td>
            <td>${details.inRule}</td>
            <td>${details.stt50}</td>
            <td>${details.stt100}</td>
            <td>${control.rnv}</td>
            <td>${details.pv}</td>
            <td>${details.riPositive}/${details.riNegative}</td>
            <td class="${fraudClass}">${details.fraudRate}</td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    
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
  const stats = calculateStats(controls);
  
  const subject = `[SNCF Contrôles] ${title} - ${dateRange}`;
  
  let body = `SNCF Contrôles - Rapport\n`;
  body += `========================\n\n`;
  body += `${title}\n`;
  body += `Période: ${dateRange}\n`;
  body += `Généré le: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}\n\n`;
  
  if (includeStats) {
    body += `RÉSUMÉ STATISTIQUE\n`;
    body += `------------------\n`;
    body += `Total contrôles: ${controls.length}\n`;
    body += `Total voyageurs: ${stats.totalPassengers}\n`;
    body += `En règle: ${stats.passengersInRule}\n`;
    body += `Taux de fraude: ${formatFraudRate(stats.fraudRate)}\n`;
    body += `Tarifs contrôle: ${stats.tarifsControle}\n`;
    body += `PV: ${stats.pv}\n`;
    body += `STT 50%: ${stats.stt50}\n`;
    body += `STT 100%: ${stats.stt100}\n`;
    body += `RNV: ${stats.rnv}\n`;
    body += `RI Positive/Négative: ${stats.riPositive}/${stats.riNegative}\n\n`;
  }
  
  body += `DÉTAIL DES CONTRÔLES\n`;
  body += `--------------------\n\n`;
  
  controls.forEach((control, index) => {
    const details = getControlDetails(control);
    body += `${index + 1}. Train ${details.trainNumber} - ${details.date} ${details.time}\n`;
    body += `   Trajet: ${details.origin} → ${details.destination}\n`;
    body += `   Voyageurs: ${details.passengers} | En règle: ${details.inRule}\n`;
    body += `   STT50: ${details.stt50} | STT100: ${details.stt100} | RNV: ${control.rnv} | PV: ${details.pv}\n`;
    body += `   Taux de fraude: ${details.fraudRate}\n\n`;
  });
  
  return { subject, body };
}

export function openMailClient(email: { subject: string; body: string }) {
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
  window.open(mailtoUrl, '_blank');
}
