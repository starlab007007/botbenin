import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, 
  Search, 
  MapPin, 
  Building2, 
  Users, 
  Target, 
  Sparkles, 
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Eye,
  Mail,
  Phone,
  Globe,
  Database,
  Filter,
  Loader2
} from 'lucide-react';
import { SmartB2BSearch } from './SmartB2BSearch';
import { GeoLocationMap } from './GeoLocationMap';
import { B2BResultsManager } from './B2BResultsManager';
import { useToast } from '@/hooks/use-toast';

interface B2BContact {
  id: string;
  name: string;
  companyName: string;
  jobTitle: string;
  location: string;
  linkedinUrl: string;
  email: string;
  phone: string;
  industry: string;
  companySize: string;
  coordinates?: [number, number];
  facebookUrl?: string;
  instagramUrl?: string;
  description?: string;
  services?: string;
  rawData?: string; // Pour conserver les données originales du webhook
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  icon: React.ReactNode;
}

interface SearchCriteria {
  prospectType: string;
  location: string;
  locationCoordinates?: { lat: number; lng: number };
  radius: number;
  useGPS: boolean;
  country: string;
  city: string;
  companyName: string;
  industry: string[];
  companySize: string;
  employeeCount: string;
  annualRevenue: string;
  foundedYear: string;
  companyType: string;
  certifications: string[];
  keywords: string[];
  description: string;
  excludeKeywords: string[];
  budget: string;
  urgency: string;
  aiSuggestions: boolean;
  prioritizeLocal: boolean;
  qualityScore: number;
  verifiedOnly: boolean;
}

interface CompleteB2BWorkflowProps {
  onBack: () => void;
}

export const CompleteB2BWorkflow: React.FC<CompleteB2BWorkflowProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(null);
  const [searchResults, setSearchResults] = useState<B2BContact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'table' | 'map'>('table');
  const { toast } = useToast();

  const workflowSteps: WorkflowStep[] = [
    {
      id: 'criteria',
      title: 'Sélection des critères',
      description: 'Définir les critères de recherche intelligents',
      status: currentStep === 0 ? 'active' : currentStep > 0 ? 'completed' : 'pending',
      icon: <Filter className="w-5 h-5" />
    },
    {
      id: 'search',
      title: 'Lancement de la recherche',
      description: 'Envoi des critères au webhook et traitement',
      status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending',
      icon: <Search className="w-5 h-5" />
    },
    {
      id: 'results',
      title: 'Affichage des résultats',
      description: 'Présentation des contacts trouvés',
      status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending',
      icon: <Database className="w-5 h-5" />
    },
    {
      id: 'visualization',
      title: 'Visualisation',
      description: 'Vue tableau et géolocalisation sur carte',
      status: currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : 'pending',
      icon: <MapPin className="w-5 h-5" />
    }
  ];

  const getCoordinatesFromLocation = (location: string, searchCriteria?: SearchCriteria): [number, number] | undefined => {
    // Priorité 1: Utiliser les coordonnées précises du critère de recherche si disponibles
    if (searchCriteria?.locationCoordinates) {
      return [searchCriteria.locationCoordinates.lng, searchCriteria.locationCoordinates.lat];
    }

    // Priorité 2: Parsing basique pour extraire des coordonnées du texte
    const coordMatch = location.match(/lat:\s*([-\d.]+),?\s*lng?:\s*([-\d.]+)/i);
    if (coordMatch) {
      return [parseFloat(coordMatch[2]), parseFloat(coordMatch[1])];
    }

    // Priorité 3: Villes connues (fallback)
    const locationLower = location.toLowerCase();
    const cityCoordinates: { [key: string]: [number, number] } = {
      'cotonou': [2.3522, 6.4023],
      'porto-novo': [2.6037, 6.4968],
      'parakou': [2.6303, 9.3365],
      'abomey': [1.9931, 7.1827],
      'paris': [2.3522, 48.8566],
      'lyon': [4.8357, 45.7640],
      'marseille': [5.3698, 43.2965],
      'toulouse': [1.4442, 43.6047],
      'bordeaux': [-0.5792, 44.8378],
      'dakar': [-17.4441, 14.6928],
      'bamako': [-8.0029, 12.6392],
      'ouagadougou': [-1.5247, 12.3714],
      'niamey': [2.1111, 13.5116],
      'lomé': [1.2255, 6.1375],
      'conakry': [-13.6773, 9.6412],
    };

    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (locationLower.includes(city)) {
        return coords;
      }
    }

    // Priorité 4: Coordonnées par défaut (Cotonou)
    return [2.3522, 6.4023];
  };

  const parseWebhookResponse = (responseText: string): B2BContact[] => {
    console.log('[Parser] Starting to parse webhook response');
    console.log('[Parser] Response length:', responseText?.length);
    
    if (!responseText || typeof responseText !== 'string') {
      console.warn('[Parser] Invalid response: empty or not string');
      return [];
    }
    
    // Nettoyer la réponse
    const cleanedResponse = responseText.trim();
    console.log('[Parser] Cleaned response preview:', cleanedResponse.substring(0, 200));
    
    const contacts: B2BContact[] = [];
    
    try {
      // Patterns multiples pour gérer différents formats de réponse
      const patterns = [
        // Format 1: Numérotation avec markdown gras
        /(\d+)\.\s*\*\*([^*\n]+)\*\*\s*\n([\s\S]*?)(?=\n\n\d+\.|\n\n[A-Z]|$)/g,
        // Format 2: Numérotation sans markdown
        /(\d+)\.\s*([^\n]+)\s*\n([\s\S]*?)(?=\n\n\d+\.|\n\n[A-Z]|$)/g,
        // Format 3: Liste avec tirets
        /-\s*\*\*([^*\n]+)\*\*\s*\n([\s\S]*?)(?=\n-|\n\n|$)/g,
        // Format 4: Simple liste avec tirets sans markdown
        /-\s*([^\n]+)\s*\n([\s\S]*?)(?=\n-|\n\n|$)/g,
        // Format 5: Nom en majuscules ou capitales
        /([A-ZÀÉÈÊËÎÏÔŒÙ][A-ZÀÉÈÊËÎÏÔŒÙa-zàéèêëîïôœùç\s&'-]{2,})\n([\s\S]*?)(?=\n[A-ZÀÉÈÊËÎÏÔŒÙ][A-ZÀÉÈÊËÎÏÔŒÙa-z]|\n\n|$)/g
      ];

      let totalMatches = 0;
      let patternUsed = -1;
      
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        let match;
        let contactIndex = 1;
        
        pattern.lastIndex = 0;
        console.log(`[Parser] Trying pattern ${i + 1}/${patterns.length}`);

        while ((match = pattern.exec(cleanedResponse)) !== null) {
          // Déterminer les groupes selon le pattern
          let companyName: string;
          let details: string;
          
          if (i === 0 || i === 1) {
            // Patterns avec numérotation
            companyName = match[2].trim().replace(/\*\*/g, '');
            details = match[3];
          } else {
            // Autres patterns
            companyName = match[1].trim().replace(/\*\*/g, '');
            details = match[2] || match[1];
          }
          
          // Validation du nom d'entreprise
          if (!companyName || companyName.length < 2 || companyName.length > 200) {
            console.log(`[Parser] Invalid company name: "${companyName}"`);
            continue;
          }
          
          // Éviter les doublons
          const isDuplicate = contacts.some(c => 
            c.companyName.toLowerCase().trim() === companyName.toLowerCase().trim()
          );
          
          if (isDuplicate) {
            console.log(`[Parser] Duplicate found: ${companyName}`);
            continue;
          }
          
          console.log(`[Parser] Processing contact ${contactIndex}: ${companyName}`);
          
          // Patterns de recherche plus flexibles et robustes
          const addressPatterns = [
            /\*\*Adresse\s*:\*\*\s*(.*?)(?:\n|$)/i,
            /Adresse\s*:\s*(.*?)(?:\n|$)/i,
            /Localisation\s*:\s*(.*?)(?:\n|$)/i,
            /Lieu\s*:\s*(.*?)(?:\n|$)/i
          ];
          
          const phonePatterns = [
            /\*\*Téléphone\s*:\*\*\s*(.*?)(?:\n|$)/i,
            /Téléphone\s*:\s*(.*?)(?:\n|$)/i,
            /Tel\s*:\s*(.*?)(?:\n|$)/i,
            /Phone\s*:\s*(.*?)(?:\n|$)/i
          ];
          
          const websitePatterns = [
            /\*\*Site web\s*:\*\*\s*\[(.*?)\]/i,
            /Site web\s*:\s*(.*?)(?:\n|$)/i,
            /Website\s*:\s*(.*?)(?:\n|$)/i,
            /URL\s*:\s*(.*?)(?:\n|$)/i,
            /www\.\S+/i,
            /https?:\/\/\S+/i
          ];
          
          const categoryPatterns = [
            /\*\*Catégorie\s*:\*\*\s*(.*?)(?:\n|$)/i,
            /Catégorie\s*:\s*(.*?)(?:\n|$)/i,
            /Type\s*:\s*(.*?)(?:\n|$)/i,
            /Secteur\s*:\s*(.*?)(?:\n|$)/i,
            /Activité\s*:\s*(.*?)(?:\n|$)/i,
            /Spécialité\s*:\s*(.*?)(?:\n|$)/i
          ];

          const emailPatterns = [
            /\*\*Email\s*:\*\*\s*(.*?)(?:\n|$)/i,
            /Email\s*:\s*(.*?)(?:\n|$)/i,
            /E-mail\s*:\s*(.*?)(?:\n|$)/i,
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
          ];

          const facebookPatterns = [
            /\*\*Facebook\s*:\*\*\s*(.*?)(?:\n|$)/i,
            /Facebook\s*:\s*(.*?)(?:\n|$)/i,
            /facebook\.com\/\S+/i
          ];

          const instagramPatterns = [
            /\*\*Instagram\s*:\*\*\s*(.*?)(?:\n|$)/i,
            /Instagram\s*:\s*(.*?)(?:\n|$)/i,
            /instagram\.com\/\S+/i
          ];

          const descriptionPatterns = [
            /\*\*Description\s*:\*\*\s*(.*?)(?:\n|$)/i,
            /Description\s*:\s*(.*?)(?:\n|$)/i,
            /Services\s*:\s*(.*?)(?:\n|$)/i,
            /Spécialisé\s*dans\s*(.*?)(?:\n|$)/i
          ];

          // Extraction avec fallbacks
          let address = '';
          let phone = '';
          let website = '';
          let category = '';
          let email = '';
          let facebook = '';
          let instagram = '';
          let description = '';

          for (const addressPattern of addressPatterns) {
            const match = details.match(addressPattern);
            if (match) {
              address = match[1].trim();
              break;
            }
          }

          for (const phonePattern of phonePatterns) {
            const match = details.match(phonePattern);
            if (match) {
              phone = match[1].trim();
              break;
            }
          }

          for (const websitePattern of websitePatterns) {
            const match = details.match(websitePattern);
            if (match) {
              website = match[1].trim();
              // Nettoyer les URLs
              if (website && !website.startsWith('http')) {
                website = website.startsWith('www.') ? `https://${website}` : `https://www.${website}`;
              }
              break;
            }
          }

          for (const categoryPattern of categoryPatterns) {
            const match = details.match(categoryPattern);
            if (match) {
              category = match[1].trim();
              break;
            }
          }

          for (const emailPattern of emailPatterns) {
            const match = details.match(emailPattern);
            if (match) {
              email = match[1] ? match[1].trim() : match[0].trim();
              break;
            }
          }

          for (const facebookPattern of facebookPatterns) {
            const match = details.match(facebookPattern);
            if (match) {
              facebook = match[1].trim();
              break;
            }
          }

          for (const instagramPattern of instagramPatterns) {
            const match = details.match(instagramPattern);
            if (match) {
              instagram = match[1].trim();
              break;
            }
          }

          for (const descriptionPattern of descriptionPatterns) {
            const match = details.match(descriptionPattern);
            if (match) {
              description = match[1].trim();
              break;
            }
          }

          const coordinates = getCoordinatesFromLocation(address, searchCriteria);

          const contact: B2BContact = {
            id: `webhook_${Date.now()}_${contactIndex}_${Math.random().toString(36).substr(2, 9)}`,
            name: '',
            companyName: companyName,
            jobTitle: '',
            location: address || 'Localisation non précisée',
            linkedinUrl: website || '',
            email: email || '',
            phone: phone || '',
            industry: category || 'Non spécifié',
            companySize: '',
            coordinates: coordinates,
            facebookUrl: facebook || '',
            instagramUrl: instagram || '',
            description: description || '',
            services: description || '',
            rawData: details
          };

          contacts.push(contact);
          contactIndex++;
          totalMatches++;
        }
        
        // Si on trouve des résultats avec ce pattern, arrêter
        if (totalMatches > 0) {
          patternUsed = i;
          console.log(`[Parser] Pattern ${i + 1} matched ${totalMatches} contacts`);
          break;
        }
      }

      if (totalMatches === 0) {
        console.warn('[Parser] No patterns matched. Response might be in unexpected format.');
        console.log('[Parser] Full response for debugging:', cleanedResponse);
      }

      console.log(`[Parser] Total contacts extracted: ${contacts.length}`);
      
      // Validation finale et dédoublonnage
      const seenNames = new Set<string>();
      const validContacts = contacts.filter(contact => {
        if (!contact.companyName || contact.companyName.trim().length < 2) {
          return false;
        }
        
        const normalizedName = contact.companyName.toLowerCase().trim();
        if (seenNames.has(normalizedName)) {
          return false;
        }
        
        seenNames.add(normalizedName);
        return true;
      });
      
      console.log(`[Parser] Valid unique contacts: ${validContacts.length}`);
      return validContacts;
      
    } catch (error) {
      console.error('Error parsing webhook response:', error);
      console.error('Response text sample:', responseText.substring(0, 500));
      return [];
    }
  };

  const getMockContacts = (): B2BContact[] => {
    return [
      {
        id: '1',
        name: 'Marie Dubois',
        companyName: 'TechCorp France',
        jobTitle: 'Directrice Marketing',
        location: 'Paris, France',
        linkedinUrl: 'https://linkedin.com/in/mariedubois',
        email: 'marie.dubois@techcorp.fr',
        phone: '+33 1 42 86 88 02',
        industry: 'Technology',
        companySize: '500-1000',
        coordinates: [2.3522, 48.8566]
      },
      {
        id: '2',
        name: 'Pierre Martin',
        companyName: 'InnovSolutions',
        jobTitle: 'Responsable Commercial',
        location: 'Lyon, France',
        linkedinUrl: 'https://linkedin.com/in/pierremartin',
        email: 'pierre.martin@innovsolutions.fr',
        phone: '+33 4 78 42 33 69',
        industry: 'Consulting',
        companySize: '100-500',
        coordinates: [4.8357, 45.7640]
      },
      {
        id: '3',
        name: 'Sophie Laurent',
        companyName: 'Digital Agency Pro',
        jobTitle: 'CEO',
        location: 'Marseille, France',
        linkedinUrl: 'https://linkedin.com/in/sophielaurent',
        email: 'sophie.laurent@digitalagency.fr',
        phone: '+33 4 91 54 92 00',
        industry: 'Marketing',
        companySize: '50-100',
        coordinates: [5.3698, 43.2965]
      }
    ];
  };

  const buildSearchMessage = (criteria: SearchCriteria) => {
    const searchTerms = [];
    
    // Prioriser les termes larges pour Google Maps
    if (criteria.location) searchTerms.push(`Localisation: ${criteria.location}`);
    if (criteria.industry.length > 0) {
      // Utiliser des termes plus génériques pour Google Maps
      const broadIndustryTerms = criteria.industry.map(industry => {
        switch(industry) {
          case 'Technologie':
            return 'informatique';
          case 'Finance':
            return 'banque';
          case 'Santé':
            return 'médical';
          case 'Commerce':
            return 'magasin';
          case 'Services':
            return 'service';
          default:
            return industry.toLowerCase();
        }
      });
      searchTerms.push(`Type d'entreprise: ${broadIndustryTerms.join(' ou ')}`);
    }
    
    // Simplifier les autres critères pour éviter les recherches trop spécifiques
    if (criteria.companyName) searchTerms.push(`Nom: ${criteria.companyName}`);
    if (criteria.keywords.length > 0) {
      // Prendre seulement les mots-clés les plus génériques
      const broadKeywords = criteria.keywords.slice(0, 2);
      searchTerms.push(`Activité: ${broadKeywords.join(' ')}`);
    }

    if (searchTerms.length === 0) {
      return "Je cherche des entreprises locales pour ma prospection via Google Maps. Pouvez-vous m'aider à identifier des entreprises avec leurs coordonnées complètes ?";
    }

    return `Je recherche des entreprises via Google Maps avec les critères suivants: ${searchTerms.join(', ')}. Utilisez des termes génériques pour obtenir plus de résultats sur Google Maps et donnez-moi les informations complètes (nom, adresse, téléphone, site web, catégorie) ?`;
  };

  const buildWebhookPayload = (criteria: SearchCriteria) => {
    return {
      // Message de recherche principal
      message: buildSearchMessage(criteria),
      
      // Données enrichies pour le webhook
      searchData: {
        // Recherche Avancée & IA
        advancedAiSearch: {
          enabled: criteria.aiSuggestions,
          qualityScore: criteria.qualityScore,
          prioritizeLocal: criteria.prioritizeLocal
        },
        
        // Mots-clés stratégiques
        strategicKeywords: criteria.keywords,
        
        // Description libre de la recherche
        freeTextDescription: criteria.description,
        
        // Critères de recherche détaillés
        searchCriteria: {
          prospectType: criteria.prospectType,
          location: criteria.location,
          coordinates: criteria.locationCoordinates,
          radius: criteria.radius,
          useGPS: criteria.useGPS,
          country: criteria.country,
          city: criteria.city,
          companyName: criteria.companyName,
          industry: criteria.industry,
          companySize: criteria.companySize,
          employeeCount: criteria.employeeCount,
          annualRevenue: criteria.annualRevenue,
          foundedYear: criteria.foundedYear,
          companyType: criteria.companyType,
          certifications: criteria.certifications,
          excludeKeywords: criteria.excludeKeywords,
          budget: criteria.budget,
          urgency: criteria.urgency,
          verifiedOnly: criteria.verifiedOnly
        }
      },
      
      // Métadonnées de session
      timestamp: new Date().toISOString(),
      session_id: `b2b_workflow_${Date.now()}`,
      user_id: 'b2b_user',
      source: 'bot_bj_platform',
      context: 'complete_b2b_workflow'
    };
  };

  const executeSearch = async (criteria: SearchCriteria, retryCount = 0) => {
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 30000; // 30 secondes
    
    setIsSearching(true);
    setSearchError(null);
    setCurrentStep(1);

    console.log(`[Search Attempt ${retryCount + 1}/${MAX_RETRIES + 1}] Executing search with criteria:`, criteria);

    try {
      const requestPayload = buildWebhookPayload(criteria);
      console.log('Webhook payload:', JSON.stringify(requestPayload, null, 2));

      // Créer un AbortController pour le timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch('https://ia.bot.bj/webhook/lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Bot.Bj-Platform/1.0',
        },
        body: JSON.stringify(requestPayload),
        mode: 'cors',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let responseData;
      let processedContent = '';

      console.log('Response content-type:', contentType);

      if (contentType.includes('application/json')) {
        responseData = await response.json();
        console.log('JSON response structure:', Object.keys(responseData));
        
        // Essayer toutes les propriétés possibles
        processedContent = responseData.output || 
                          responseData.message || 
                          responseData.response || 
                          responseData.text || 
                          responseData.content ||
                          responseData.reply ||
                          responseData.data ||
                          (typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
      } else {
        processedContent = await response.text();
      }

      console.log('Processed content length:', processedContent.length);
      console.log('Content preview:', processedContent.substring(0, 300));

      if (!processedContent || processedContent.trim().length === 0) {
        throw new Error('Réponse vide du webhook');
      }

      const extractedContacts = parseWebhookResponse(processedContent);
      console.log(`Extracted ${extractedContacts.length} contacts from response`);
      
      if (extractedContacts.length > 0) {
        setSearchResults(extractedContacts);
        setCurrentStep(2);
        setIsSearching(false);
        toast({
          title: "✅ Recherche terminée",
          description: `${extractedContacts.length} contact${extractedContacts.length > 1 ? 's' : ''} trouvé${extractedContacts.length > 1 ? 's' : ''}`,
        });
        return;
      } else {
        // Aucun contact trouvé - essayer de retry si possible
        if (retryCount < MAX_RETRIES) {
          console.log(`No contacts found, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2 secondes
          return executeSearch(criteria, retryCount + 1);
        }
        
        setSearchResults([]);
        setSearchError("Aucun contact trouvé malgré plusieurs tentatives");
        setCurrentStep(2);
        setIsSearching(false);
        toast({
          title: "⚠️ Aucun résultat",
          description: "La recherche n'a retourné aucun contact. Essayez avec des critères plus larges.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error(`[Search Error - Attempt ${retryCount + 1}]:`, error);
      
      // Gérer le timeout spécifiquement
      if (error instanceof Error && error.name === 'AbortError') {
        if (retryCount < MAX_RETRIES) {
          console.log('Timeout - retrying...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return executeSearch(criteria, retryCount + 1);
        }
        
        setSearchError('Délai d\'attente dépassé');
        toast({
          title: "⏱️ Timeout",
          description: "La recherche a pris trop de temps. Veuillez réessayer.",
          variant: "destructive",
        });
      } else {
        // Autres erreurs
        if (retryCount < MAX_RETRIES) {
          console.log(`Error occurred, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return executeSearch(criteria, retryCount + 1);
        }
        
        setSearchError(error instanceof Error ? error.message : 'Erreur inconnue');
        toast({
          title: "❌ Erreur de recherche",
          description: "Impossible de se connecter au service. Vérifiez votre connexion.",
          variant: "destructive",
        });
      }
      
      setSearchResults([]);
      setCurrentStep(2);
      setIsSearching(false);
    }
  };

  const handleCriteriaSubmit = (criteria: SearchCriteria) => {
    setSearchCriteria(criteria);
    executeSearch(criteria);
  };

  const handleStepNavigation = (stepIndex: number) => {
    if (stepIndex === 0) {
      setCurrentStep(0);
      setSearchError(null);
    } else if (stepIndex === 1 && searchCriteria) {
      // Relancer la recherche
      executeSearch(searchCriteria);
    } else if (stepIndex === 2 && searchResults.length > 0) {
      setCurrentStep(2);
    } else if (stepIndex === 3 && searchResults.length > 0) {
      setCurrentStep(4);
    }
  };

  const handleReturnToModules = () => {
    if (window.confirm('Êtes-vous sûr de vouloir retourner aux modules ? Vos résultats actuels seront perdus.')) {
      onBack();
    }
  };

  const handleResetSearch = () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser la recherche ?')) {
      setCurrentStep(0);
      setSearchCriteria(null);
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
    }
  };

  const handleViewResults = () => {
    setCurrentStep(4);
  };

  const handleExport = () => {
    const csvContent = [
      ['Nom', 'Entreprise', 'Poste', 'Email', 'Téléphone', 'Localisation', 'Secteur', 'Taille Entreprise', 'LinkedIn'],
      ...searchResults.map(contact => [
        contact.name,
        contact.companyName,
        contact.jobTitle,
        contact.email,
        contact.phone,
        contact.location,
        contact.industry,
        contact.companySize,
        contact.linkedinUrl
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contacts_b2b_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: "Export réussi",
      description: `${searchResults.length} contacts exportés au format CSV`,
    });
  };

  const resetWorkflow = () => {
    setCurrentStep(0);
    setSearchCriteria(null);
    setSearchResults([]);
    setSearchError(null);
    setIsSearching(false);
  };

  const getStepStatusIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'active':
        return isSearching && step.id === 'search' ? 
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" /> : 
          <Clock className="w-5 h-5 text-blue-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={handleReturnToModules}
              className="mr-4 hover:bg-white/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux modules
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Workflow B2B Complet
              </h1>
              <p className="text-gray-600 mt-1">
                Processus intégré de recherche et visualisation de prospects
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleResetSearch}
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Réinitialiser
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-gray-600">IA Intégrée</span>
            </div>
          </div>
        </div>

        {/* Workflow Steps */}
        <Card className="mb-6 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Étapes du Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {workflowSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                    step.status === 'active' 
                      ? 'border-blue-500 bg-blue-50' 
                      : step.status === 'completed'
                      ? 'border-green-500 bg-green-50 hover:bg-green-100'
                      : step.status === 'error'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                  onClick={() => handleStepNavigation(index)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {getStepStatusIcon(step)}
                    <span className="font-medium">{step.title}</span>
                  </div>
                  <p className="text-sm text-gray-600">{step.description}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge 
                      variant={step.status === 'completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {step.status === 'completed' ? 'Terminé' : 
                       step.status === 'active' ? 'En cours' : 
                       step.status === 'error' ? 'Erreur' : 'En attente'}
                    </Badge>
                    {step.status === 'completed' && (
                      <span className="text-xs text-blue-600 font-medium">Cliquer pour revoir</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        {currentStep === 0 && (
          <SmartB2BSearch
            onBack={resetWorkflow}
            onSearch={handleCriteriaSubmit}
          />
        )}

        {currentStep === 1 && (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                Recherche en cours...
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-lg font-medium">Traitement de votre recherche</p>
                  <p className="text-gray-600">Envoi des critères au webhook et analyse...</p>
                </div>
              </div>
              
              {searchCriteria && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium mb-2">Critères de recherche :</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {searchCriteria.prospectType && <p><span className="font-medium">Type:</span> {searchCriteria.prospectType}</p>}
                    {searchCriteria.location && <p><span className="font-medium">Localisation:</span> {searchCriteria.location}</p>}
                    {searchCriteria.industry.length > 0 && <p><span className="font-medium">Secteur:</span> {searchCriteria.industry.join(', ')}</p>}
                    {searchCriteria.companySize && <p><span className="font-medium">Taille:</span> {searchCriteria.companySize}</p>}
                    {searchCriteria.budget && <p><span className="font-medium">Budget:</span> {searchCriteria.budget}</p>}
                    {searchCriteria.urgency && <p><span className="font-medium">Urgence:</span> {searchCriteria.urgency}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep >= 2 && (
          <div className="space-y-6">
            {/* Results Summary */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-green-600" />
                    Résultats de la recherche
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-600">
                      {searchResults.length} contacts trouvés
                    </Badge>
                    <Button onClick={handleExport} size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Exporter CSV
                    </Button>
                    {currentStep === 2 && (
                      <Button onClick={handleViewResults} size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Visualiser
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {searchError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-red-800 mb-1">Erreur de recherche</h4>
                        <p className="text-sm text-red-700 mb-3">{searchError}</p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => searchCriteria && executeSearch(searchCriteria)}
                            className="text-red-700 border-red-300 hover:bg-red-100"
                          >
                            Réessayer
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setCurrentStep(0)}
                            className="text-blue-700 border-blue-300 hover:bg-blue-100"
                          >
                            Modifier critères
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {searchResults.length === 0 && !searchError && currentStep >= 2 && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-800 mb-1">Aucun résultat trouvé</h4>
                        <p className="text-sm text-blue-700 mb-3">Votre recherche n'a retourné aucun contact. Essayez d'élargir vos critères.</p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setCurrentStep(0)}
                            className="text-blue-700 border-blue-300 hover:bg-blue-100"
                          >
                            Modifier la recherche
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{searchResults.length}</p>
                    <p className="text-sm text-gray-600">Contacts qualifiés</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <Building2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{new Set(searchResults.map(c => c.companyName)).size}</p>
                    <p className="text-sm text-gray-600">Entreprises uniques</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <MapPin className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-600">{searchResults.filter(c => c.coordinates).length}</p>
                    <p className="text-sm text-gray-600">Géolocalisés</p>
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Advanced Results Management */}
            {currentStep >= 2 && (
              <B2BResultsManager
                contacts={searchResults}
                onExport={handleExport}
                searchSessionId={`b2b_session_${Date.now()}`}
              />
            )}

            {/* Visualization */}
            {currentStep === 4 && (
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      Visualisation des résultats
                    </CardTitle>
                    <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as 'table' | 'map')}>
                      <TabsList>
                        <TabsTrigger value="table">Tableau</TabsTrigger>
                        <TabsTrigger value="map">Carte</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={selectedView} className="w-full">
                    <TabsContent value="table" className="mt-0">
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Contact</TableHead>
                              <TableHead>Entreprise</TableHead>
                              <TableHead>Poste</TableHead>
                              <TableHead>Localisation</TableHead>
                              <TableHead>Contact</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {searchResults.map((contact) => (
                              <TableRow key={contact.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{contact.name}</p>
                                    <p className="text-sm text-gray-600">{contact.industry}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{contact.companyName}</p>
                                    <Badge variant="outline" className="text-xs">
                                      {contact.companySize}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>{contact.jobTitle}</TableCell>
                                <TableCell>{contact.location}</TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-sm">
                                      <Mail className="w-3 h-3" />
                                      {contact.email}
                                    </div>
                                    <div className="flex items-center gap-1 text-sm">
                                      <Phone className="w-3 h-3" />
                                      {contact.phone}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="outline" asChild>
                                      <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer">
                                        <Globe className="w-3 h-3" />
                                      </a>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                    <TabsContent value="map" className="mt-0">
                      <div className="h-[600px] border rounded-lg overflow-hidden">
                        <GeoLocationMap 
                          contacts={searchResults}
                          userLocation={[2.3522, 6.4023]}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Button onClick={resetWorkflow} variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Nouvelle recherche
              </Button>
              <Button onClick={handleExport} variant="default">
                <Download className="w-4 h-4 mr-2" />
                Exporter les données
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};