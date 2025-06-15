
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

interface QRCodeModalProps {
  botName: string;
  qrCodeUrl: string;
  onDownload: () => void;
  onShare: () => void;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  botName, qrCodeUrl, onDownload, onShare, onClose,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <Card className="p-6 max-w-md w-full mx-4">
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold">QR Code du Chatbot</h3>
        <img src={qrCodeUrl} alt="QR Code" className="mx-auto" />
        <p className="text-sm text-gray-600">
          Scannez ce QR Code pour accéder directement au chat
        </p>
        <div className="flex space-x-2">
          <Button onClick={onDownload} variant="outline" size="sm" className="flex-1">
            <Download className="w-4 h-4 mr-2" /> Télécharger
          </Button>
          <Button
            onClick={onShare}
            variant="outline"
            size="sm"
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            <FaWhatsapp className="w-4 h-4 mr-2" /> WhatsApp
          </Button>
        </div>
        <Button onClick={onClose} variant="ghost" size="sm" className="w-full">
          Fermer
        </Button>
      </div>
    </Card>
  </div>
);
