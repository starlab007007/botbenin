import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversationEvent {
  action: string;
  agentId: string;
  timestamp: string;
  userId: string;
  data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as ConversationEvent;
    console.log('📡 Received conversation event:', body);

    const { action, agentId, userId, data } = body;

    // Validate required fields
    if (!action || !agentId) {
      throw new Error('Missing required fields: action, agentId');
    }

    // Process different conversation events
    let response: any = {};

    switch (action) {
      case 'conversation_started':
        response = {
          status: 'success',
          message: 'Conversation initiated successfully',
          instructions: 'Jarvis is now listening and ready to assist',
          nextAction: 'activate_voice_processing'
        };
        break;

      case 'widget_activated':
        response = {
          status: 'success',
          message: 'ElevenLabs ConvAI widget activated',
          instructions: 'Voice interface is now active',
          capabilities: ['voice_input', 'voice_output', 'real_time_processing']
        };
        break;

      case 'convai_conversation_started':
        response = {
          status: 'success',
          message: 'Real-time conversation established',
          instructions: 'Jarvis is processing voice input and generating responses',
          features: ['speech_to_text', 'ai_processing', 'text_to_speech']
        };
        break;

      case 'convai_message':
        response = {
          status: 'success',
          message: 'Processing voice message',
          instructions: 'Analyzing speech and preparing AI response',
          processingSteps: [
            'Speech recognition completed',
            'NLP analysis in progress',
            'Generating contextual response',
            'Converting to speech output'
          ]
        };
        break;

      case 'conversation_ended':
      case 'convai_conversation_ended':
        response = {
          status: 'success',
          message: 'Conversation session ended',
          instructions: 'Jarvis conversation completed',
          summary: 'Session closed successfully'
        };
        break;

      default:
        response = {
          status: 'received',
          message: `Event ${action} processed`,
          instructions: 'Continuing conversation monitoring'
        };
    }

    // Add conversation context and session information
    const enrichedResponse = {
      ...response,
      conversationId: `conv_${Date.now()}`,
      agentId,
      userId,
      timestamp: new Date().toISOString(),
      platform: 'jarvis-web-interface',
      eventData: data,
      webhook: {
        source: 'jarvis-conversation',
        processed: true,
        responseTime: Date.now()
      }
    };

    console.log('✅ Processed conversation event:', enrichedResponse);

    return new Response(
      JSON.stringify(enrichedResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );

  } catch (error) {
    console.error('❌ N8N conversation handler error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        timestamp: new Date().toISOString(),
        instructions: 'Please check the request format and try again'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});