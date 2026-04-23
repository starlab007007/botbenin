import React from 'react';
import { Helmet } from '@/components/SEO';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import { PdfBookReader } from '@/components/support/PdfBookReader';

const GUIDE_URL = '/docs/Guide_SIGDSTS_COMPLET.pdf';

const SupportGuidePage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Guide SIGDSTS — Lecture interactive | Support Technique</title>
        <meta
          name="description"
          content="Consultez le Guide officiel SIGDSTS comme un livre électronique : navigation page par page, sommaire interactif, recherche par chapitre."
        />
        <link rel="canonical" href="https://bot.bj/sigdsts/guide" />
      </Helmet>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
        {/* Breadcrumb */}
        <div className="mb-3 flex items-center gap-2 text-sm">
          <Link to="/sigdsts" className="text-muted-foreground hover:text-primary transition-colors">
            ← Retour au support SIGDSTS
          </Link>
        </div>

        {/* En-tête */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
              <BookOpen className="w-3 h-3 mr-1" /> Documentation officielle
            </Badge>
            <Badge variant="outline">SIGDSTS v11.0</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-emerald-700 to-blue-700 bg-clip-text text-transparent">
            Guide SIGDSTS — Lecture interactive
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-3xl">
            Parcourez le guide page par page ou utilisez le sommaire pour aller directement à un chapitre.
            Compatible mobile, tablette et ordinateur.
          </p>
        </div>

        {/* Lecteur */}
        <PdfBookReader fileUrl={GUIDE_URL} title="Guide SIGDSTS Complet" />

        {/* Aide */}
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Astuce clavier : <kbd className="px-1.5 py-0.5 bg-muted rounded border">←</kbd>{' '}
          <kbd className="px-1.5 py-0.5 bg-muted rounded border">→</kbd> pour changer de page,{' '}
          <kbd className="px-1.5 py-0.5 bg-muted rounded border">+</kbd>{' '}
          <kbd className="px-1.5 py-0.5 bg-muted rounded border">−</kbd> pour zoomer.
        </div>
      </div>
    </>
  );
};

export default SupportGuidePage;
