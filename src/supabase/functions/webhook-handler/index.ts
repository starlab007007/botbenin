
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { message, bot_id, session_id, user_email, user_name, ip_address, user_agent } = await req.json()

    console.log('=== WEBHOOK HANDLER START ===')
    console.log('Received data:', { message, bot_id, session_id, user_email, user_name })

    // 1. Gérer l'utilisateur du bot (visiteur/client)
    let botUserId;
    
    if (session_id) {
      // Chercher un utilisateur existant par session_id
      const { data: existingUser } = await supabaseClient
        .from('bot_users')
        .select('id')
        .eq('session_id', session_id)
        .eq('bot_id', bot_id)
        .single()

      if (existingUser) {
        botUserId = existingUser.id
        // Mettre à jour la dernière activité
        await supabaseClient
          .from('bot_users')
          .update({ 
            last_active: new Date().toISOString(),
            user_email: user_email || null,
            user_name: user_name || null
          })
          .eq('id', botUserId)
      } else {
        // Créer un nouveau utilisateur
        const { data: newUser, error: userError } = await supabaseClient
          .from('bot_users')
          .insert({
            bot_id,
            session_id,
            user_email: user_email || null,
            user_name: user_name || null,
            is_authenticated: !!user_email,
            user_metadata: {},
            last_active: new Date().toISOString()
          })
          .select('id')
          .single()

        if (userError) {
          console.error('Erreur création utilisateur:', userError)
          throw userError
        }
        
        botUserId = newUser.id
      }
    }

    // 2. Stocker le message utilisateur
    const { error: messageError } = await supabaseClient
      .from('chat_messages')
      .insert({
        bot_id,
        bot_user_id: botUserId,
        message_content: message,
        message_type: 'user',
        metadata: {
          ip_address,
          user_agent,
          timestamp: new Date().toISOString()
        },
        ip_address,
        user_agent
      })

    if (messageError) {
      console.error('Erreur stockage message:', messageError)
      throw messageError
    }

    // 3. Générer une réponse du bot (simulation)
    const botResponse = generateBotResponse(message)

    // 4. Stocker la réponse du bot
    const { error: botMessageError } = await supabaseClient
      .from('chat_messages')
      .insert({
        bot_id,
        bot_user_id: botUserId,
        message_content: botResponse,
        message_type: 'bot',
        metadata: {
          generated_at: new Date().toISOString(),
          response_time: '50ms'
        }
      })

    if (botMessageError) {
      console.error('Erreur stockage réponse bot:', botMessageError)
      throw botMessageError
    }

    // 5. Mettre à jour les statistiques de session
    if (session_id) {
      await supabaseClient
        .from('chat_sessions')
        .upsert({
          bot_id,
          bot_user_id: botUserId,
          session_token: session_id,
          session_metadata: {
            last_message_at: new Date().toISOString(),
            user_data: { user_email, user_name }
          }
        })
    }

    console.log('=== WEBHOOK HANDLER SUCCESS ===')

    return new Response(
      JSON.stringify({ 
        output: botResponse,
        session_id,
        status: 'success'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('=== WEBHOOK HANDLER ERROR ===')
    console.error('Error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur',
        message: 'Je rencontre des difficultés techniques. Veuillez réessayer.',
        status: 'error'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

function generateBotResponse(message: string): string {
  const responses = [
    "Merci pour votre message ! Comment puis-je vous aider aujourd'hui ?",
    "Je comprends votre demande. Voici ce que je peux vous proposer...",
    "C'est une excellente question ! Laissez-moi vous expliquer...",
    "Je suis là pour vous aider. Pouvez-vous me donner plus de détails ?",
    "Parfait ! Je vais traiter votre demande immédiatement.",
  ]
  
  // Réponses contextuelles simples
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('bonjour') || lowerMessage.includes('salut')) {
    return "Bonjour ! Je suis ravi de vous rencontrer. Comment puis-je vous aider aujourd'hui ?"
  }
  
  if (lowerMessage.includes('prix') || lowerMessage.includes('coût')) {
    return "Concernant nos tarifs, nous proposons plusieurs options adaptées à vos besoins. Souhaitez-vous que je vous présente nos différentes offres ?"
  }
  
  if (lowerMessage.includes('aide') || lowerMessage.includes('problème')) {
    return "Je suis là pour vous aider ! Pouvez-vous me décrire plus précisément votre situation ?"
  }
  
  if (lowerMessage.includes('merci')) {
    return "Je vous en prie ! N'hésitez pas si vous avez d'autres questions."
  }
  
  // Réponse par défaut aléatoire
  return responses[Math.floor(Math.random() * responses.length)]
}
