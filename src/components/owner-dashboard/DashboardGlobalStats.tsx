
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Users, MessageSquare, Activity } from 'lucide-react';

interface DashboardGlobalStatsProps {
  totalBots: number;
  activeBots: number;
  totalUsers: number;
  activeUsers24h: number;
  totalMessages: number;
  messages24h: number;
  avgSessionDuration: number;
  totalSessions: number;
}

export const DashboardGlobalStats: React.FC<DashboardGlobalStatsProps> = ({
  totalBots,
  activeBots,
  totalUsers,
  activeUsers24h,
  totalMessages,
  messages24h,
  avgSessionDuration,
  totalSessions
}) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{totalBots}</div>
            <div className="text-sm text-gray-600">Chatbots totaux</div>
            <div className="text-xs text-green-600">
              {activeBots} actifs
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{totalUsers}</div>
            <div className="text-sm text-gray-600">Utilisateurs totaux</div>
            <div className="text-xs text-orange-600">
              {activeUsers24h} actifs 24h
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{totalMessages}</div>
            <div className="text-sm text-gray-600">Messages totaux</div>
            <div className="text-xs text-blue-600">
              {messages24h} aujourd'hui
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(avgSessionDuration || 0)}
            </div>
            <div className="text-sm text-gray-600">Msgs/session moy.</div>
            <div className="text-xs text-gray-500">
              {totalSessions} sessions
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);
