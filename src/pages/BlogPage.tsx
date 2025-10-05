import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  image?: string;
}

export const BlogPage: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    document.title = 'Blog Bot.BJ - Guides Chatbot WhatsApp, IA & Automatisation Business Bénin';
  }, []);

  const blogPosts: BlogPost[] = [
    {
      slug: 'comment-creer-chatbot-whatsapp-benin',
      title: 'Comment créer un chatbot WhatsApp au Bénin en 10 minutes',
      excerpt: 'Guide complet pour créer votre premier chatbot WhatsApp intelligent avec Bot.BJ. Sans compétence technique requise.',
      category: 'Guide débutant',
      date: '2025-01-15',
      readTime: '8 min'
    },
    {
      slug: 'automatisation-whatsapp-business-pme',
      title: 'Automatisation WhatsApp Business pour PME béninoises',
      excerpt: "Découvrez comment automatiser votre support client sur WhatsApp et gagner jusqu'à 20h par semaine.",
      category: 'Automatisation',
      date: '2025-01-12',
      readTime: '10 min'
    },
    {
      slug: 'qualification-leads-ia-whatsapp',
      title: 'Qualification automatique des leads avec IA sur WhatsApp',
      excerpt: 'Apprenez à qualifier vos prospects automatiquement et augmenter vos conversions de +40%.',
      category: 'Marketing',
      date: '2025-01-10',
      readTime: '12 min'
    },
    {
      slug: 'whatsapp-api-business-benin',
      title: 'WhatsApp Business API au Bénin : Le guide complet 2025',
      excerpt: 'Tout ce que vous devez savoir sur WhatsApp Business API et comment l\'intégrer à votre business.',
      category: 'Technique',
      date: '2025-01-08',
      readTime: '15 min'
    },
    {
      slug: 'cas-usage-chatbot-ecommerce',
      title: 'Cas d\'usage : Chatbot WhatsApp pour e-commerce',
      excerpt: 'Comment un chatbot WhatsApp peut transformer votre boutique en ligne et automatiser vos ventes.',
      category: 'Cas d\'usage',
      date: '2025-01-05',
      readTime: '9 min'
    },
    {
      slug: 'roi-chatbot-whatsapp-pme',
      title: 'ROI d\'un chatbot WhatsApp : Analyse complète pour PME',
      excerpt: 'Analyse détaillée du retour sur investissement d\'un chatbot WhatsApp pour votre entreprise.',
      category: 'Business',
      date: '2025-01-03',
      readTime: '11 min'
    }
  ];

  const categories = ['Tous', 'Guide débutant', 'Automatisation', 'Marketing', 'Technique', 'Cas d\'usage', 'Business'];

  return (
    <>
      <div className="min-h-screen gradient-warm">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[{ label: 'Blog', href: '/blog' }]} />
          
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>

          <header className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Blog Bot.BJ - Chatbot WhatsApp & IA au Bénin
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Guides, tutoriels et conseils pour automatiser votre business avec WhatsApp et l'intelligence artificielle
            </p>
          </header>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {categories.map((category) => (
              <Badge key={category} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                {category}
              </Badge>
            ))}
          </div>

          {/* Blog Posts Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {blogPosts.map((post) => (
              <Card key={post.slug} className="hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate(`/blog/${post.slug}`)}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{post.category}</Badge>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readTime}
                      </span>
                    </div>
                  </div>
                  <CardTitle className="text-xl hover:text-primary transition-colors">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                  <Button variant="link" className="p-0">
                    Lire l'article <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA Section */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="text-center py-8">
              <h2 className="text-2xl font-bold mb-4">Prêt à créer votre chatbot WhatsApp ?</h2>
              <p className="text-muted-foreground mb-6">
                Rejoignez +1000 entreprises béninoises qui automatisent leur business avec Bot.BJ
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button size="lg" onClick={() => navigate('/auth')}>
                  Démarrer gratuitement
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/pricing')}>
                  Voir les tarifs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};
