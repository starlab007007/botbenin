import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fonction pour obtenir un token d'accès Google
async function getGoogleAccessToken(): Promise<string> {
  const GOOGLE_SERVICE_ACCOUNT_KEY = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  
  if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY manquant');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);
  } catch (parseError) {
    throw new Error('Format JSON invalide pour GOOGLE_SERVICE_ACCOUNT_KEY');
  }

  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Clé de service account incomplète');
  }
  
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/documents.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const base64UrlEncode = (obj: any): string => {
    const jsonStr = JSON.stringify(obj);
    const base64 = btoa(jsonStr);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  let privateKey = serviceAccount.private_key;
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Format de clé privée invalide');
  }

  try {
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = privateKey
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s+/g, '');

    const binaryString = atob(pemContents);
    const keyBuffer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      keyBuffer[i] = binaryString.charCodeAt(i);
    }

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer.buffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signingInput)
    );

    const signatureArray = new Uint8Array(signatureBuffer);
    let signatureBase64 = '';
    for (let i = 0; i < signatureArray.length; i++) {
      signatureBase64 += String.fromCharCode(signatureArray[i]);
    }
    const encodedSignature = btoa(signatureBase64)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const jwt = `${signingInput}.${encodedSignature}`;
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      throw new Error(`Échec de l'authentification Google: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error('Token d\'accès non reçu de Google');
    }
    
    return tokenData.access_token;
    
  } catch (keyError) {
    console.error('Erreur d\'authentification:', keyError);
    throw new Error(`Erreur d'authentification Google: ${keyError instanceof Error ? keyError.message : 'Unknown error'}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { docId } = await req.json();
    
    if (!docId) {
      return new Response(
        JSON.stringify({ error: 'ID du document manquant' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Lecture du Google Doc:', { docId });

    try {
      // Obtenir le token d'accès
      const accessToken = await getGoogleAccessToken();
      
      // Lire le document Google
      const getDocUrl = `https://docs.googleapis.com/v1/documents/${docId}`;
      const getDocResponse = await fetch(getDocUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!getDocResponse.ok) {
        const error = await getDocResponse.text();
        console.error('Erreur lecture Google Doc:', error);
        throw new Error('Impossible de lire le document Google');
      }

      const docData = await getDocResponse.json();
      
      // Extraire le texte du document
      let content = '';
      if (docData.body && docData.body.content) {
        content = docData.body.content
          .filter((element: any) => element.paragraph)
          .map((element: any) => 
            element.paragraph.elements
              .filter((el: any) => el.textRun)
              .map((el: any) => el.textRun.content)
              .join('')
          )
          .join('');
      }

      console.log('Contenu lu avec succès depuis Google Doc:', content.length, 'caractères');

      return new Response(
        JSON.stringify({ 
          content: content,
          docId: docId,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (authError) {
      console.error('Erreur d\'authentification Google:', authError);
      
      // Fallback en mode simulation si l'authentification échoue
      const simulatedContent = `OFFRE COMMERCIALE

MÉMO POUR L'ÉQUIPE COMMERCIALE

PROPOSITION DE VALEUR
Une équipe d'agents IA qui propulse votre entreprise en automatisant les tâches répétitives pour libérer du temps stratégique.

CIBLES IDÉALES
Entreprises qui :
• Perdent du temps sur des processus manuels répétitifs
• Ont des équipes surchargées par l'opérationnel
• Cherchent à améliorer leur productivité
• Ont des difficultés de recrutement
• Veulent rester compétitives mais manquent de temps pour se former à l'IA

MÉTHODE EN 3 ÉTAPES
1. Audit gratuit : Analyse des processus et identification des opportunités
2. Développement : Création de workflows intelligents intégrés aux outils existants
3. Déploiement : Mise en place rapide avec documentation et suivi continu

TARIFS
• Audit : Gratuit (30 minutes)
• Premier test : À partir de 50 000 cfa
• Solution complète : Sur devis
• Coûts typiques : 200 000 -300 000 cfa initial + 40 000-100 000 cfa/semaine`;
      
      return new Response(
        JSON.stringify({ 
          content: simulatedContent,
          docId: docId,
          timestamp: new Date().toISOString(),
          message: 'Mode simulation - configurez GOOGLE_SERVICE_ACCOUNT_KEY pour la synchronisation réelle'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error: any) {
    console.error('Erreur dans google-docs-reader:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur lors de la lecture du document Google',
        details: error?.message || 'Erreur inconnue'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});