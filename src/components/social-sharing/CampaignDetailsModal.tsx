
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Campaign = {
  id: string;
  name: string;
  description: string;
  customMessage?: string | null;
  targetPlatforms: string[];
  previewImages?: string[];
  createdAt: string;
};

const PLATFORMS = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "telegram", label: "Telegram" },
  { key: "facebook", label: "Facebook" },
  { key: "messenger", label: "Messenger" },
  { key: "twitter", label: "Twitter/X" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "tiktok", label: "TikTok" },
  { key: "instagram", label: "Instagram" },
];

export const CampaignDetailsModal: React.FC<{
  open: boolean;
  campaign: Campaign | null;
  onClose: () => void;
}> = ({ open, campaign, onClose }) => {
  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>
            Détails de la campagne&nbsp;: {campaign.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <span className="font-bold">Description : </span>
            <span>{campaign.description || <span className="italic text-gray-400">Aucune</span>}</span>
          </div>
          <div>
            <span className="font-bold">Images :</span>
            {(Array.isArray(campaign.previewImages) && campaign.previewImages.length > 0) ? (
              <div className="flex gap-2 mt-1">
                {campaign.previewImages.filter(Boolean).slice(0, 3).map((url, i) => (
                  <img
                    src={url!}
                    alt={`img-${i}`}
                    key={url! + i}
                    className="object-cover rounded border w-16 h-16"
                    style={{ aspectRatio: "1/1" }}
                  />
                ))}
              </div>
            ) : (
              <span className="ml-2 text-gray-400 italic">Aucune</span>
            )}
          </div>
          <div>
            <span className="font-bold">Plateformes cibles : </span>
            <span>
              {campaign.targetPlatforms?.length
                ? campaign.targetPlatforms.map(p =>
                    PLATFORMS.find(x => x.key === p)?.label || p
                  ).join(", ")
                : <span className="text-gray-400 italic">Aucune</span>}
            </span>
          </div>
          <div>
            <span className="font-bold">Message personnalisé :</span>
            <div className="whitespace-pre-wrap text-gray-700">{campaign.customMessage || <span className="italic text-gray-400">Aucun</span>}</div>
          </div>
          <div>
            <span className="font-bold">Créée le : </span>
            <span>{new Date(campaign.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
