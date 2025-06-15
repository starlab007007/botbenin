
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader, RefreshCw } from "lucide-react";

interface Props {
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const SessionLoadingOrError: React.FC<Props> = ({ loading, error, refetch }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm text-gray-500">Chargement des messages...</span>
      </div>
    )
  }
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-sm mb-2">Erreur: {error}</div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="w-3 h-3 mr-1" />
          Réessayer
        </Button>
      </div>
    );
  }
  return null;
};
