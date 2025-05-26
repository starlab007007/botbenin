
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { message, bot_id, user_session, user_email, user_name, ip_address, user_agent } = await req.json()

    console.log('Received webhook data:', { message, bot_id, user_session, user_email, user_name })

    // Créer ou récupérer l'utilisateur du bot
    let botUser;
    
    // Chercher d'abord par session_id ou email
    const { data: existingUser, error: searchError } = await supabaseClient
      .from('bot_users')
      .select('*')
      .eq('bot_id', bot_id)
      .or(`session_id.eq.${user_session},user_email.eq.${user_email}`)
      .maybeSingle()

    if (existingUser) {
      // Mettre à jour la dernière activité
      const { data: updatedUser, error: updateError } = await supabaseClient
        .from('bot_users')
        .update({ 
          last_active: new Date().toISOString(),
          user_name: user_name || existingUser.user_name,
          user_email: user_email || existingUser.user_email
        })
        .eq('id', existingUser.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating bot user:', updateError)
        throw updateError
      }
      botUser = updatedUser
    } else {
      // Créer un nouvel utilisateur
      const { data: newUser, error: createError } = await supabaseClient
        .from('bot_users')
        .insert([
          {
            bot_id,
            session_id: user_session,
            user_email: user_email || null,
            user_name: user_name || null,
            is_authenticated: !!user_email,
            last_active: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (createError) {
        console.error('Error creating bot user:', createError)
        throw createError
      }
      botUser = newUser
    }

    // Enregistrer le message de l'utilisateur
    const { data: userMessage, error: userMessageError } = await supabaseClient
      .from('chat_messages')
      .insert([
        {
          bot_id,
          bot_user_id: botUser.id,
          message_content: message,
          message_type: 'user',
          ip_address: ip_address || null,
          user_agent: user_agent || null,
          metadata: { timestamp: new Date().toISOString() }
        }
      ])
      .select()
      .single()

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError)
      throw userMessageError
    }

    // Récupérer les informations du bot pour le webhook
    const { data: bot, error: botError } = await supabaseClient
      .from('bots')
      .select('webhook_url, configuration')
      .eq('id', bot_id)
      .single()

    if (botError || !bot.webhook_url) {
      console.error('Bot not found or no webhook URL:', botError)
      return new Response(
        JSON.stringify({ 
          output: "Désolé, ce bot n'est pas configuré correctement. Veuillez contacter l'administrateur." 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Appeler le webhook du bot avec le message
    let botResponse = "Désolé, je ne peux pas répondre pour le moment.";
    
    try {
      const webhookResponse = await fetch(bot.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          user_id: botUser.id,
          session_id: user_session,
          user_email: user_email || null,
          user_name: user_name || null,
          bot_id,
          timestamp: new Date().toISOString()
        })
      })

      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.text()
        
        try {
          const jsonData = JSON.parse(webhookData)
          botResponse = jsonData.output || jsonData.message || jsonData.response || webhookData
        } catch {
          botResponse = webhookData
        }
      } else {
        console.error('Webhook failed:', webhookResponse.status, webhookResponse.statusText)
      }
    } catch (error) {
      console.error('Error calling webhook:', error)
    }

    // Enregistrer la réponse du bot
    const { error: botMessageError } = await supabaseClient
      .from('chat_messages')
      .insert([
        {
          bot_id,
          bot_user_id: botUser.id,
          message_content: botResponse,
          message_type: 'bot',
          metadata: { 
            timestamp: new Date().toISOString(),
            webhook_url: bot.webhook_url
          }
        }
      ])

    if (botMessageError) {
      console.error('Error saving bot message:', botMessageError)
    }

    return new Response(
      JSON.stringify({ output: botResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        output: "Une erreur technique s'est produite. Veuillez réessayer." 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  }
})
