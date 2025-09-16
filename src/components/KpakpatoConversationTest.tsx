import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { KpakpatoConversation } from './KpakpatoConversation';
import { ElevenLabsDiagnostic } from './ElevenLabsDiagnostic';
import { CheckCircle, XCircle, AlertTriangle, Mic, MessageCircle, Activity } from 'lucide-react';
import { toast } from 'sonner';

export const KpakpatoConversationTest: React.FC = () => {
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any[]>([]);

  const handleToggleConversation = () => {
    setIsConversationActive(!isConversationActive);
    setConversationError(null);
  };

  const handleConversationError = (error: string) => {
    setConversationError(error);
    toast.error(`Erreur Kpakpato: ${error}`);
    setTestResults(prev => [...prev, {
      test: 'Conversation Error',
      status: 'FAIL',
      details: error,
      timestamp: new Date().toISOString()
    }]);
  };

  const runConversationTests = async () => {
    setTestResults([]);
    
    // Test 1: Vérifier les permissions navigateur
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      setTestResults(prev => [...prev, {
        test: 'Microphone Permissions',
        status: 'PASS',
        details: 'Microphone access granted',
        timestamp: new Date().toISOString()
      }]);
    } catch (error: any) {
      setTestResults(prev => [...prev, {
        test: 'Microphone Permissions',
        status: 'FAIL',
        details: `Permission denied: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    }

    // Test 2: Vérifier la compatibilité WebSocket
    try {
      const wsTest = new WebSocket('wss://echo.websocket.org');
      
      await new Promise((resolve, reject) => {
        wsTest.onopen = () => {
          setTestResults(prev => [...prev, {
            test: 'WebSocket Compatibility',
            status: 'PASS',
            details: 'WebSocket connection successful',
            timestamp: new Date().toISOString()
          }]);
          wsTest.close();
          resolve(true);
        };
        
        wsTest.onerror = () => {
          setTestResults(prev => [...prev, {
            test: 'WebSocket Compatibility',
            status: 'FAIL',
            details: 'WebSocket connection failed',
            timestamp: new Date().toISOString()
          }]);
          reject(new Error('WebSocket failed'));
        };
        
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });
    } catch (error: any) {
      setTestResults(prev => [...prev, {
        test: 'WebSocket Compatibility',
        status: 'FAIL',
        details: `WebSocket test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    }

    // Test 3: Vérifier MediaRecorder
    try {
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder not supported');
      }
      
      const formats = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg'
      ];
      
      const supportedFormats = formats.filter(format => 
        MediaRecorder.isTypeSupported(format)
      );
      
      setTestResults(prev => [...prev, {
        test: 'MediaRecorder Support',
        status: supportedFormats.length > 0 ? 'PASS' : 'FAIL',
        details: `Supported formats: ${supportedFormats.join(', ') || 'None'}`,
        timestamp: new Date().toISOString()
      }]);
    } catch (error: any) {
      setTestResults(prev => [...prev, {
        test: 'MediaRecorder Support',
        status: 'FAIL',
        details: `MediaRecorder test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAIL':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Test Complet de Kpakpato</h1>
        <p className="text-muted-foreground">
          Diagnostic et test de la conversation vocale avec ElevenLabs ConvAI
        </p>
      </div>

      {/* Diagnostic ElevenLabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Étape 1: Diagnostic ElevenLabs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ElevenLabsDiagnostic />
        </CardContent>
      </Card>

      <Separator />

      {/* Tests de compatibilité navigateur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Étape 2: Tests de Compatibilité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runConversationTests} className="w-full">
            Lancer les tests de compatibilité
          </Button>
          
          {testResults.length > 0 && (
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.test}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{result.details}</span>
                    <Badge variant={result.status === 'PASS' ? 'default' : 'destructive'}>
                      {result.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Test de conversation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Étape 3: Test de Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded">
            <div>
              <h3 className="font-medium">Statut de Kpakpato</h3>
              <p className="text-sm text-muted-foreground">
                {isConversationActive 
                  ? 'Conversation active - vous pouvez parler avec Kpakpato' 
                  : 'Conversation inactive'
                }
              </p>
            </div>
            <Badge variant={isConversationActive ? 'default' : 'secondary'}>
              {isConversationActive ? 'ACTIF' : 'INACTIF'}
            </Badge>
          </div>

          {conversationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="font-medium text-red-800">Erreur détectée:</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{conversationError}</p>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Cliquez sur le bouton Kpakpato pour tester la conversation vocale
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Instructions de Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <p><strong>1.</strong> Lancez d'abord le diagnostic ElevenLabs pour vérifier la configuration API</p>
            <p><strong>2.</strong> Exécutez les tests de compatibilité pour vérifier votre navigateur</p>
            <p><strong>3.</strong> Cliquez sur le bouton Kpakpato pour démarrer une conversation</p>
            <p><strong>4.</strong> Testez à la fois la conversation vocale et les messages texte</p>
            <p><strong>5.</strong> Vérifiez que les transcriptions s'affichent correctement</p>
          </div>
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> La conversation doit maintenant fonctionner exactement comme 
              sur le site officiel ElevenLabs avec le même agent ID.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Composant Kpakpato */}
      <KpakpatoConversation
        isActive={isConversationActive}
        onToggle={handleToggleConversation}
        onError={handleConversationError}
      />
    </div>
  );
};