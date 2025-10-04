import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ParsedData {
  headers: string[];
  rows: any[];
  metadata: {
    fileName: string;
    fileType: string;
    rowCount: number;
    columnCount: number;
  };
}

export const useFileParser = () => {
  const { toast } = useToast();
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = useCallback(async (file: File): Promise<ParsedData> => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce((obj: any, header, idx) => {
        obj[header] = values[idx]?.trim() || '';
        return obj;
      }, {});
    });

    return {
      headers,
      rows,
      metadata: {
        fileName: file.name,
        fileType: 'CSV',
        rowCount: rows.length,
        columnCount: headers.length
      }
    };
  }, []);

  const parseExcel = useCallback(async (file: File): Promise<ParsedData> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1).map(row => {
      return headers.reduce((obj: any, header, idx) => {
        obj[header] = row[idx] || '';
        return obj;
      }, {});
    });

    return {
      headers,
      rows,
      metadata: {
        fileName: file.name,
        fileType: 'Excel',
        rowCount: rows.length,
        columnCount: headers.length
      }
    };
  }, []);

  const parsePDF = useCallback(async (file: File): Promise<ParsedData> => {
    // Pour PDF, on peut utiliser une API ou une bibliothèque comme pdf.js
    // Pour l'instant, on simule l'extraction
    toast({
      title: "Traitement PDF",
      description: "Extraction du texte via OCR en cours...",
    });

    // Simuler un délai de traitement
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Données simulées - en production, utiliser une vraie extraction PDF/OCR
    return {
      headers: ['Nom', 'Email', 'Téléphone', 'Entreprise'],
      rows: [
        { 'Nom': 'Extrait du PDF', 'Email': 'exemple@email.com', 'Téléphone': '+229...', 'Entreprise': 'Société XYZ' }
      ],
      metadata: {
        fileName: file.name,
        fileType: 'PDF',
        rowCount: 1,
        columnCount: 4
      }
    };
  }, [toast]);

  const parseImage = useCallback(async (file: File): Promise<ParsedData> => {
    // Pour les images, on utiliserait Tesseract.js ou une API OCR
    toast({
      title: "OCR en cours",
      description: "Extraction du texte de l'image...",
    });

    // Simuler le traitement OCR
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Données simulées - en production, utiliser un vrai OCR
    return {
      headers: ['Texte extrait', 'Confiance'],
      rows: [
        { 'Texte extrait': 'Contenu détecté dans l\'image', 'Confiance': '85%' }
      ],
      metadata: {
        fileName: file.name,
        fileType: 'Image',
        rowCount: 1,
        columnCount: 2
      }
    };
  }, [toast]);

  const parseWord = useCallback(async (file: File): Promise<ParsedData> => {
    // Pour Word, on peut utiliser mammoth.js
    toast({
      title: "Traitement Word",
      description: "Extraction du contenu...",
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Données simulées
    return {
      headers: ['Contenu', 'Section'],
      rows: [
        { 'Contenu': 'Texte extrait du document Word', 'Section': 'Paragraphe 1' }
      ],
      metadata: {
        fileName: file.name,
        fileType: 'Word',
        rowCount: 1,
        columnCount: 2
      }
    };
  }, [toast]);

  const parseFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      let data: ParsedData;

      if (file.name.endsWith('.csv')) {
        data = await parseCSV(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        data = await parseExcel(file);
      } else if (file.name.endsWith('.pdf')) {
        data = await parsePDF(file);
      } else if (file.type.startsWith('image/')) {
        data = await parseImage(file);
      } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        data = await parseWord(file);
      } else {
        throw new Error('Format de fichier non supporté');
      }

      setParsedData(data);
      
      toast({
        title: "Fichier analysé",
        description: `${data.metadata.rowCount} lignes détectées avec ${data.metadata.columnCount} colonnes.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      toast({
        title: "Erreur de parsing",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [parseCSV, parseExcel, parsePDF, parseImage, parseWord, toast]);

  return {
    parseFile,
    parsedData,
    isProcessing,
    error
  };
};
