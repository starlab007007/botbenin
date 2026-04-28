import jsPDF from 'jspdf';
import type { QuizModule } from '@/data/sigdsts-quiz/types';

export const generateCertificate = (params: {
  userName: string;
  module: QuizModule;
  score: number;
  total: number;
  date: Date;
}) => {
  const { userName, module, score, total, date } = params;
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
  doc.text('ATTESTATION DE FORMATION', W / 2, 35, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text('Plateforme SIGDSTS — Système d\'Information de Gestion du Don du Sang et de la Transfusion', W / 2, 45, { align: 'center' });

  // Body
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text('Le présent certificat atteste que', W / 2, 70, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(20, 20, 20);
  doc.text(userName || '—', W / 2, 85, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text('a complété avec succès le quiz de formation', W / 2, 100, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(16, 122, 87);
  doc.text(`Module ${module.order} — ${module.title}`, W / 2, 113, { align: 'center' });

  // Score
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(`Score obtenu : ${score} / ${total}  (${ratio}%)`, W / 2, 130, { align: 'center' });

  const mention = ratio >= 90 ? 'Excellent' : ratio >= 70 ? 'Bien' : 'À revoir';
  doc.setFont('helvetica', 'bold');
  doc.text(`Mention : ${mention}`, W / 2, 140, { align: 'center' });

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(`Référence Guide : ${module.guideSection} · pages ${module.guidePages}`, W / 2, 160, { align: 'center' });
  doc.text(`Délivré le ${date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, W / 2, 168, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Bot.bj × SIGDSTS — Formation continue · Guide SIGDSTS Complet v11.0 (Mars 2026)', W / 2, H - 18, { align: 'center' });

  doc.save(`Attestation_SIGDSTS_${module.shortTitle}_${userName.replace(/\s+/g, '_') || 'Stagiaire'}.pdf`);
};
