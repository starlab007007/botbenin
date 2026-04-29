import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { QuizModule } from '@/data/sigdsts-quiz/types';

export interface CertificateParams {
  userName: string;
  module: QuizModule;
  score: number;
  total: number;
  date: Date;
  certificateCode?: string | null;
  verifyUrl?: string | null;
}

export const generateCertificate = async (params: CertificateParams) => {
  const { userName, module, score, total, date, certificateCode, verifyUrl } = params;
  const ratio = Math.round((score / total) * 100);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Border
  doc.setDrawColor(16, 122, 87);
  doc.setLineWidth(2);
  doc.rect(10, 10, W - 20, H - 20);
  doc.setLineWidth(0.5);
  doc.rect(13, 13, W - 26, H - 26);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 122, 87);
  doc.setFontSize(28);
  doc.text('ATTESTATION DE FORMATION', W / 2, 32, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text("Plateforme SIGDSTS — Système d'Information de Gestion du Don du Sang et de la Transfusion", W / 2, 41, { align: 'center' });

  // Body
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text('Le présent certificat atteste que', W / 2, 62, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(20, 20, 20);
  doc.text(userName || '—', W / 2, 76, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text('a complété avec succès le quiz de formation', W / 2, 90, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(16, 122, 87);
  doc.text(`Module ${module.order} — ${module.title}`, W / 2, 102, { align: 'center' });

  // Score
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text(`Score obtenu : ${score} / ${total}  (${ratio}%)`, W / 2, 118, { align: 'center' });

  const mention = ratio >= 90 ? 'Excellent' : ratio >= 70 ? 'Bien' : 'À revoir';
  doc.setFont('helvetica', 'bold');
  doc.text(`Mention : ${mention}`, W / 2, 127, { align: 'center' });

  // Footer info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Référence Guide : ${module.guideSection} · pages ${module.guidePages}`, W / 2, 145, { align: 'center' });
  doc.text(
    `Délivré le ${date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    W / 2,
    152,
    { align: 'center' },
  );

  // Certificate code & verification (bottom-left block + QR right)
  if (certificateCode) {
    const blockY = H - 48;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(16, 122, 87);
    doc.text("N° d'attestation", 22, blockY);

    doc.setFont('courier', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 20);
    doc.text(certificateCode, 22, blockY + 7);

    if (verifyUrl) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Vérification en ligne :', 22, blockY + 14);
      doc.setTextColor(37, 99, 235);
      doc.text(verifyUrl, 22, blockY + 19);

      // QR code
      try {
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
          margin: 0,
          width: 256,
          color: { dark: '#107a57', light: '#ffffff' },
        });
        const qrSize = 30;
        doc.addImage(qrDataUrl, 'PNG', W - qrSize - 22, H - qrSize - 22, qrSize, qrSize);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text('Scanner pour vérifier', W - qrSize / 2 - 22, H - 18, { align: 'center' });
      } catch (e) {
        console.warn('QR generation failed', e);
      }
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text('Bot.bj × SIGDSTS — Formation continue · Guide SIGDSTS Complet v11.0', W / 2, H - 14, { align: 'center' });

  const safeName = (userName || 'Stagiaire').replace(/\s+/g, '_');
  doc.save(`Attestation_SIGDSTS_${module.shortTitle}_${safeName}.pdf`);
};
