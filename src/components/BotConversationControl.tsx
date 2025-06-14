
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Search, MessageSquare, Users, CheckCircle, Loader, ChevronRight } from "lucide-react";

interface Bot {
  id: string;
  name: string;
  is_active: boolean;
}

interface BotSession {
  session_id: string;
  last_message_at: string;
  status: string;
  last_message: string;
  unread: boolean;
}

interface Message {
  message_id: string;
  content: string;
  created_at: string;
  sender: string;
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

  // Charge les sessions/conversations pour le bot sélectionné
  useEffect(() => {
    if (!selectedBot) return;
    setLoadingSessions(true);

    // DEMO/Mock: Remplacer par un appel Supabase réel aux sessions groupées par bot_id
    setTimeout(() => {
      setSessions([
        {
          session_id: "sess-1",
          last_message_at: "2024-06-14T12:10:00Z",
          status: "active",
          last_message: "Bonjour, je souhaite une démo.",
          unread: true,
        },
        {
          session_id: "sess-2",
          last_message_at: "2024-06-13T09:20:00Z",
          status: "closed",
          last_message: "Merci de votre réponse.",
          unread: false,
        },
      ]);
      setLoadingSessions(false);
    }, 500);
  }, [selectedBot]);

  // Charge les messages pour la session sélectionnée
  useEffect(() => {
    if (!selectedSession) return;
    setLoadingMessages(true);
    // DEMO/mock, à remplacer par fetch réel Supabase
    setTimeout(() => {
      setMessages([
        {
          message_id: "msg-1",
          content: "Bonjour, je souhaite une démo.",
          created_at: "2024-06-14T12:10:00Z",
          sender: "user"
        },
        {
          message_id: "msg-2",
          content: "Bonjour ! Je suis votre assistant virtuel. Comment puis-je vous aider ?",
          created_at: "2024-06-14T12:10:10Z",
          sender: "bot"
        },
      ]);
      setLoadingMessages(false);
    }, 500);
  }, [selectedSession]);

  // Recherche simple sur les sessions
  const filteredSessions = sessions.filter(c =>
    !query ||
    c.last_message.toLowerCase().includes(query.toLowerCase()) ||
    c.session_id.toLowerCase().includes(query.toLowerCase())
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

      {/* Colonne Conversations */}
      <Card className="w-1/3 flex flex-col gap-2 px-3 py-4 overflow-auto">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="text-primary w-4 h-4" />
          <span className="font-semibold">Conversations</span>
          <Input
            className="ml-auto max-w-[130px]"
            placeholder="Rechercher..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            size={20}
          />
        </div>
        {loadingSessions && <Loader className="animate-spin mx-auto my-8" />}
        {!loadingSessions && filteredSessions.length === 0 && (
          <div className="text-gray-500 text-sm text-center mt-8">
            Aucune conversation trouvée
          </div>
        )}
        {!loadingSessions &&
          filteredSessions
            .map(s => (
            <Card
              as="button"
              key={s.session_id}
              className={cn(
                "p-3 mb-2 w-full bg-gray-50 hover:bg-blue-50 flex flex-col border transition cursor-pointer",
                selectedSession?.session_id === s.session_id && "border-blue-600 shadow"
              )}
              onClick={() => setSelectedSession(s)}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium truncate">
                  Session {s.session_id}
                </div>
                <div className={cn("text-xs rounded px-2 py-0.5 ml-2",
                  s.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-500"
                )}>
                  {s.status}
                </div>
                {s.unread && (
                  <span className="ml-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                )}
              </div>
              <div className="text-xs text-gray-600 truncate">
                {s.last_message}
              </div>
              <div className="text-[10px] text-gray-400">
                {new Date(s.last_message_at).toLocaleString()}
              </div>
            </Card>
          ))}
      </Card>

      {/* Colonne Messages */}
      <Card className="w-1/2 flex flex-col px-3 py-4 items-stretch overflow-auto">
        {!selectedSession ? (
          <div className="flex flex-1 items-center justify-center text-gray-400 text-lg h-full">
            <ChevronRight className="w-6 h-6 mr-1" /> Sélectionnez une conversation
          </div>
        ) : (
          <>
            <div className="mb-2 font-semibold text-lg text-primary flex items-center">
              Détails de la session {selectedSession.session_id}
            </div>
            <div className="flex-1 overflow-y-auto max-h-[48vh] space-y-2">
              {loadingMessages ? (
                <Loader className="animate-spin mx-auto my-16" />
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.message_id}
                    className={cn(
                      "p-2 rounded shadow-sm my-1 max-w-[75%]",
                      msg.sender === "user"
                        ? "ml-0 bg-blue-100 text-right self-start"
                        : "ml-auto bg-gray-200 self-end"
                    )}
                  >
                    <div className="text-xs text-gray-500 mb-1">{msg.sender === "user" ? "Utilisateur" : "Bot"}</div>
                    <div className="text-sm">{msg.content}</div>
                    <div className="text-xs text-gray-400 text-right">{new Date(msg.created_at).toLocaleTimeString()}</div>
                  </div>
                ))
              )}
            </div>
            {/* Zone réponse rapide */}
            {selectedSession.status === "active" && (
              <form
                className="flex items-center gap-2 mt-4"
                onSubmit={e => {
                  e.preventDefault();
                  // TODO: Envoyer une réponse (manuel pour MVP)
                }}
              >
                <Input className="flex-1" placeholder="Répondre..." disabled />
                <Button type="submit" disabled>Envoyer</Button>
              </form>
            )}
          </>
        )}
      </Card>
    </div>
  );
};
