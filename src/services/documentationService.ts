import { DocumentMetadata } from '@/config/documentation';

export class DocumentationService {
  /**
   * Charge le contenu d'un fichier markdown
   */
  static async loadDocument(filePath: string): Promise<string> {
    try {
      const response = await fetch(filePath);
      
      if (!response.ok) {
        throw new Error(`Failed to load document: ${response.statusText}`);
      }
      
      const content = await response.text();
      return content;
    } catch (error) {
      console.error('Error loading document:', error);
      return `# Document non disponible\n\nLe document demandé n'a pas pu être chargé.\n\n**Erreur**: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Recherche dans les documents
   */
  static searchDocuments(
    documents: DocumentMetadata[],
    searchTerm: string
  ): DocumentMetadata[] {
    if (!searchTerm.trim()) {
      return documents;
    }

    const term = searchTerm.toLowerCase();
    
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(term) ||
      doc.description.toLowerCase().includes(term) ||
      doc.category.toLowerCase().includes(term)
    );
  }

  /**
   * Filtre les documents par catégorie
   */
  static filterByCategory(
    documents: DocumentMetadata[],
    category: string | null
  ): DocumentMetadata[] {
    if (!category) {
      return documents;
    }

    return documents.filter(doc => doc.category === category);
  }

  /**
   * Groupe les documents par catégorie
   */
  static groupByCategory(
    documents: DocumentMetadata[]
  ): Record<string, DocumentMetadata[]> {
    return documents.reduce((acc, doc) => {
      if (!acc[doc.category]) {
        acc[doc.category] = [];
      }
      acc[doc.category].push(doc);
      return acc;
    }, {} as Record<string, DocumentMetadata[]>);
  }

  /**
   * Génère une table des matières à partir du contenu markdown
   */
  static generateTableOfContents(content: string): Array<{ level: number; text: string; id: string }> {
    const lines = content.split('\n');
    const toc: Array<{ level: number; text: string; id: string }> = [];

    lines.forEach(line => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-');
        
        toc.push({ level, text, id });
      }
    });

    return toc;
  }
}
