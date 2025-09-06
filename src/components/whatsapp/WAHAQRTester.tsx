import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const WAHAQRTester: React.FC = () => {
  const [sessionName, setSessionName] = useState('111111111');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDirectWAHAProxy = async () => {
    setLoading(true);
    setLogs([]);
    setQrCode('');

    try {
      addLog('🔄 Testing direct WAHA proxy...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Test multiple endpoints
      const endpoints = [
        `/api/sessions/${sessionName}/auth/qr?format=base64`,
        `/api/sessions/${sessionName}/auth/qr`,
        `/api/sessions/${sessionName}/qr?format=base64`,
        `/api/sessions/${sessionName}/qr`,
        `/api/v2/sessions/${sessionName}/auth/qr?format=base64`,
        `/api/v2/sessions/${sessionName}/auth/qr`
      ];

      for (const endpoint of endpoints) {
        try {
          addLog(`📡 Testing endpoint: ${endpoint}`);
          
          const url = new URL(`/functions/v1/waha-dashboard-proxy`, 'https://mvynepqulhflxtyymtzs.supabase.co');
          url.searchParams.set('path', endpoint);

          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          addLog(`📊 Response status: ${response.status} ${response.statusText}`);

          if (response.ok) {
            const data = await response.json();
            addLog(`📋 Response keys: ${Object.keys(data).join(', ')}`);
            
            const qrCandidate = data.qr || data.base64 || data.image || data.qrcode;
            if (qrCandidate) {
              addLog(`✅ QR found! Length: ${qrCandidate.length}`);
              const normalizedQr = qrCandidate.startsWith('data:image') 
                ? qrCandidate 
                : `data:image/png;base64,${qrCandidate}`;
              setQrCode(normalizedQr);
              toast.success('QR Code récupéré avec succès!');
              break;
            } else {
              addLog(`⚠️ No QR in response: ${JSON.stringify(data).substring(0, 200)}`);
            }
          } else {
            const errorText = await response.text();
            addLog(`❌ Error: ${errorText}`);
          }
        } catch (e) {
          addLog(`❌ Endpoint ${endpoint} failed: ${e.message}`);
        }
      }

      if (!qrCode) {
        addLog('❌ No QR code found in any endpoint');
      }

    } catch (error) {
      addLog(`❌ Test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testEdgeFunction = async () => {
    setLoading(true);
    setLogs([]);
    setQrCode('');

    try {
      addLog('🔄 Testing edge function waha-session-manager...');
      
      const { data, error } = await supabase.functions.invoke('waha-session-manager', {
        body: { action: 'qr', sessionName }
      });

      addLog(`📋 Edge function response: ${JSON.stringify({ 
        hasData: !!data, 
        hasError: !!error,
        errorMsg: error?.message,
        dataKeys: data ? Object.keys(data) : []
      })}`);

      if (error) {
        addLog(`❌ Edge function error: ${error.message}`);
        toast.error('Erreur edge function');
      } else if (data?.qrCode) {
        addLog(`✅ QR found via edge function! Length: ${data.qrCode.length}`);
        const normalizedQr = data.qrCode.startsWith('data:image') 
          ? data.qrCode 
          : `data:image/png;base64,${data.qrCode}`;
        setQrCode(normalizedQr);
        toast.success('QR Code récupéré via edge function!');
      } else {
        addLog(`⚠️ No QR in edge function response: ${JSON.stringify(data)}`);
      }

    } catch (error) {
      addLog(`❌ Edge function test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    setLoading(true);
    setLogs([]);

    try {
      addLog('🚀 Starting session...');
      
      const { data, error } = await supabase.functions.invoke('waha-session-manager', {
        body: { action: 'start', sessionName }
      });

      if (error) {
        addLog(`❌ Start session error: ${error.message}`);
      } else {
        addLog(`✅ Session started successfully`);
        toast.success('Session démarrée!');
      }

    } catch (error) {
      addLog(`❌ Start session failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🔍 WAHA QR Code Tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-center">
          <Input
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Session name"
            className="flex-1"
          />
          <Button onClick={startSession} disabled={loading} variant="outline">
            Start Session
          </Button>
        </div>

        <div className="flex gap-2">
          <Button onClick={testDirectWAHAProxy} disabled={loading}>
            Test WAHA Proxy
          </Button>
          <Button onClick={testEdgeFunction} disabled={loading}>
            Test Edge Function
          </Button>
        </div>

        {logs.length > 0 && (
          <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        )}

        {qrCode && (
          <div className="text-center">
            <h3 className="font-semibold mb-2">QR Code Retrieved:</h3>
            <img src={qrCode} alt="QR Code" className="mx-auto max-w-xs border" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WAHAQRTester;