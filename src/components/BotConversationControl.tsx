import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Search, MessageSquare, Users, CheckCircle, Loader, ChevronRight, User } from "lucide-react";

interface Bot {
  id: string;
  name: string;
  is_active: boolean;
}

interface BotSession {
  id: string;
  session_token: string;
  last_activity: string;
  started_at: string;
  is_active: boolean;
  entry_point: string;
  user_agent: string | null;
  ip_address: string | null;
  bot_user_id: string | null;
}

interface Message {
  id: string;
  message_content: string;
  created_at: string;
  message_type: string; // 'bot' | 'user'
}

// SESSION NORMALIZER
function normalizeSession(s: any): BotSession {
  return {
    id: s.id,
    session_token: s.session_token,
    last_activity: s.last_activity,
    started_at: s.started_at,
    is_active: s.is_active,
    entry_point: s.entry_point,
    user_agent: typeof s.user_agent === "string" ? s.user_agent : null,
    ip_address:
      typeof s.ip_address === "string"
        ? s.ip_address
        : s.ip_address === null || s.ip_address === undefined
          ? null
          : String(s.ip_address),
    bot_user_id: typeof s.bot_user_id === "string" ? s.bot_user_id : null
  };
}

export const BotConversationControl: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loadingBots, setLoadingBots] = useState(true);

  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);

  const [sessions, setSessions] = useState<BotSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [selectedSession, setSelectedSession] = useState<BotSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [query, setQuery] = useState("");

  // Helper pour formater l'affichage utilisateur/session (anon/auth)
  const getSessionUserLabel = (session: BotSession) => {
    if (!session.bot_user_id) return "Visiteur anonyme";
    return "Utilisateur connecté";
  };

  // Charge la liste des bots de l'utilisateur
  useEffect(() => {
    const fetchBots = async () => {
      setLoadingBots(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoadingBots(false);

      const { data: ownerData } = await supabase
        .from("bot_owners")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!ownerData) return setLoadingBots(false);

      const { data: botsData } = await supabase
        .from("bots")
        .select("id, name, is_active")
        .eq("owner_id", ownerData.id);

      setBots(botsData || []);
      setLoadingBots(false);
    };

    fetchBots();
  }, []);

  // Charge les sessions/conversations publiques pour le bot sélectionné
  useEffect(() => {
    if (!selectedBot) return;
    setLoadingSessions(true);

    const fetchSessions = async () => {
      // On considère seulement les sessions nées d'un lien public/shortened_link
      const { data: sessData, error } = await supabase
        .from("enhanced_chat_sessions")
        .select("id, session_token, last_activity, started_at, is_active, entry_point, user_agent, ip_address, bot_user_id")
        .eq("bot_id", selectedBot.id)
        .in("entry_point", ["shortened_link", "public_url"])
        .order("last_activity", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[BotConversationControl] Erreur récupération sessions publiques :", error);
        setSessions([]);
      } else {
        // Explicitly cast sessData to any[] before mapping, and as BotSession[]
        const sessionsRaw: any[] = sessData ?? [];
        const normalized = sessionsRaw.map(normalizeSession) as BotSession[];
        setSessions(normalized);
      }
      setLoadingSessions(false);
      setSelectedSession(null);
      setMessages([]);
    };

    fetchSessions();
  }, [selectedBot]);

  // Charge les messages pour la session sélectionnée (filtrage par session_token)
  useEffect(() => {
    if (!selectedSession) return;
    setLoadingMessages(true);

    const fetchMessages = async () => {
      // NB : Les messages doivent avoir été associés à la session_token
      const { data: msgData, error } = await supabase
        .from("chat_messages")
        .select("id, message_content, created_at, message_type")
        .eq("bot_id", selectedBot?.id || "")
        .eq("session_token", selectedSession.session_token)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.error("[BotConversationControl] Erreur récupération messages session :", error);
        setMessages([]);
      } else {
        setMessages(msgData || []);
      }
      setLoadingMessages(false);
    };

    fetchMessages();
  }, [selectedSession, selectedBot]);

  // Recherche sur sessions : session_token, entry_point, ip...
  const filteredSessions = sessions.filter(s =>
    !query ||
    (s.session_token && s.session_token.toLowerCase().includes(query.toLowerCase())) ||
    (s.user_agent && s.user_agent.toLowerCase().includes(query.toLowerCase())) ||
    (s.ip_address && s.ip_address.includes(query))
  );

  return (
    <div className="flex gap-2 h-[70vh]">
      {/* Colonne Bots */}
      <Card className="w-1/5 min-w-[180px] max-w-xs flex flex-col gap-2 px-2 py-4 overflow-auto">
        <div className="font-semibold mb-2 text-lg flex items-center">
          <Users className="w-4 h-4 mr-1 text-primary" />
          Vos bots
        </div>
        {loadingBots ? (
          <Loader className="animate-spin mx-auto my-8" />
        ) : (
          bots.map(bot => (
            <Button
              key={bot.id}
              size="sm"
              variant={selectedBot?.id === bot.id ? "default" : "outline"}
              onClick={() => {
                setSelectedBot(bot);
                setSelectedSession(null);
              }}
              className="flex w-full justify-between items-center mb-1"
            >
              <span className="truncate">{bot.name}</span>
              {bot.is_active && <CheckCircle className="w-4 h-4 ml-1 text-green-500" />}
            </Button>
          ))
        )}
      </Card>

      {/* Colonne Sessions publiques */}
      <Card className="w-1/3 flex flex-col gap-2 px-3 py-4 overflow-auto">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="text-primary w-4 h-4" />
          <span className="font-semibold">Conversations publiques</span>
          <Input
            className="ml-auto max-w-[130px]"
            placeholder="Rechercher…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            size={20}
          />
        </div>
        {loadingSessions && <Loader className="animate-spin mx-auto my-8" />}
        {!loadingSessions && filteredSessions.length === 0 && (
          <div className="text-gray-500 text-sm text-center mt-8">
            Aucune session publique trouvée
          </div>
        )}
        {!loadingSessions &&
          filteredSessions.map(s => (
            <button
              type="button"
              key={s.id}
              className={cn(
                "p-3 mb-2 w-full bg-gray-50 hover:bg-blue-50 flex flex-col border transition cursor-pointer rounded-lg text-left",
                selectedSession?.id === s.id && "border-blue-600 shadow"
              )}
              onClick={() => setSelectedSession(s)}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium truncate">
                  Session {s.session_token.slice(0, 10)}…
                </div>
                <div className={cn("text-xs rounded px-2 py-0.5 ml-2",
                  s.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-500"
                )}>
                  {s.is_active ? "active" : "terminée"}
                </div>
                <span className="ml-2 flex items-center text-xs">
                  <User className="w-3 h-3 mr-1" />
                  {getSessionUserLabel(s)}
                </span>
              </div>
              <div className="text-[10px] text-gray-400">
                {s.last_activity
                  ? new Date(s.last_activity).toLocaleString()
                  : ""}
              </div>
              <div className="truncate text-xs text-gray-600">
                Entrée : {s.entry_point}
              </div>
            </button>
          ))}
      </Card>

      {/* Colonne Messages */}
      <Card className="w-1/2 flex flex-col px-3 py-4 items-stretch overflow-auto">
        {!selectedSession ? (
          <div className="flex flex-1 items-center justify-center text-gray-400 text-lg h-full">
            <ChevronRight className="w-6 h-6 mr-1" /> Sélectionnez une session
          </div>
        ) : (
          <>
            <div className="mb-2 font-semibold text-lg text-primary flex items-center">
              Détails de la session {selectedSession.session_token.slice(0, 10)}…
            </div>
            <div className="flex-1 overflow-y-auto max-h-[48vh] space-y-2">
              {loadingMessages ? (
                <Loader className="animate-spin mx-auto my-16" />
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={cn(
                      "p-2 rounded shadow-sm my-1 max-w-[75%]",
                      msg.message_type === "user"
                        ? "ml-0 bg-blue-100 text-right self-start"
                        : "ml-auto bg-gray-200 self-end"
                    )}
                  >
                    <div className="text-xs text-gray-500 mb-1">
                      {msg.message_type === "user" ? "Visiteur/utilisateur" : "Bot"}
                    </div>
                    <div className="text-sm">{msg.message_content}</div>
                    <div className="text-xs text-gray-400 text-right">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
