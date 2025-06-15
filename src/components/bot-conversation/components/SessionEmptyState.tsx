
import React from "react";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

export const SessionEmptyState = () => (
  <Card className="flex flex-col px-3 py-4 items-stretch overflow-auto h-full">
    <div className="flex flex-1 items-center justify-center text-gray-400 text-lg h-full">
      <ChevronRight className="w-6 h-6 mr-1" /> Sélectionnez une session pour voir les messages
    </div>
  </Card>
);
