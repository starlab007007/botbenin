import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { 
  Share2,
  Facebook,
  Instagram,
  MessageCircle,
  Copy,
  ExternalLink,
  Phone,
  Mail,
  Send,
  CheckCircle
} from 'lucide-react';

interface SocialSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  botLink: string;
  message: string;
}

export const SocialSharingModal: React.FC<SocialSharingModalProps> = ({
  isOpen,
  onClose,
  botLink,
  message
}) => {
  const [customMessage, setCustomMessage] = useState(message);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePhone, setSharePhone] = useState('');
  const { toast } = useToast();

  const socialPlatforms = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => shareToWhatsApp()
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => shareToFacebook()
    },
    {
      id: 'messenger',
      name: 'Messenger',
      icon: MessageCircle,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => shareToMessenger()
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      action: () => shareToInstagram()
    }
  ];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié",
      description: `${label} copié dans le presse-papiers`,
    });
  };

  const shareToWhatsApp = () => {
    const encodedMessage = encodeURIComponent(customMessage);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "WhatsApp ouvert",
      description: "Vous pouvez maintenant partager le message",
    });
  };

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(botLink)}&quote=${encodeURIComponent(customMessage)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    
    toast({
      title: "Facebook ouvert",
      description: "Partagez sur votre page Facebook",
    });
  };

  const shareToMessenger = () => {
    const messengerUrl = `https://www.messenger.com/new/?text=${encodeURIComponent(customMessage + ' ' + botLink)}`;
    window.open(messengerUrl, '_blank');
    
    toast({
      title: "Messenger ouvert",
      description: "Envoyez via Facebook Messenger",
    });
  };

  const shareToInstagram = () => {
    // Instagram ne permet pas le partage direct de liens, donc on copie le message
    copyToClipboard(customMessage + '\n\n' + botLink, 'Message pour Instagram');
    toast({
      title: "Prêt pour Instagram",
      description: "Collez le message copié dans votre story ou post Instagram",
    });
  };

  const sendEmail = () => {
    if (!shareEmail) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une adresse email",
        variant: "destructive"
      });
      return;
    }

    const subject = encodeURIComponent("Invitation à une qualification rapide");
    const body = encodeURIComponent(customMessage);
    const mailtoUrl = `mailto:${shareEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    
    toast({
      title: "Email préparé",
      description: "Votre client email s'ouvre avec le message pré-rempli",
    });
  };

  const sendSMS = () => {
    if (!sharePhone) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un numéro de téléphone",
        variant: "destructive"
      });
      return;
    }

    const smsUrl = `sms:${sharePhone}?body=${encodeURIComponent(customMessage)}`;
    window.location.href = smsUrl;
    
    toast({
      title: "SMS préparé",
      description: "Votre application SMS s'ouvre avec le message pré-rempli",
    });
  };

  const shareToTikTok = () => {
    // TikTok ne permet pas le partage direct de liens, donc on copie le message
    copyToClipboard(customMessage + '\n\n' + botLink, 'Message pour TikTok');
    toast({
      title: "Prêt pour TikTok",
      description: "Collez le message copié dans votre contenu TikTok",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Share2 className="w-5 h-5 mr-2" />
            Partager la Qualification sur les Réseaux
          </DialogTitle>
          <DialogDescription>
            Partagez votre bot de qualification sur différents canaux pour maximiser la portée
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Message personnalisé */}
          <div>
            <Label htmlFor="customMessage">Message de partage</Label>
            <Textarea
              id="customMessage"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={6}
              className="mt-2"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                Le message sera adapté automatiquement selon le canal
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(customMessage, 'Message')}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copier
              </Button>
            </div>
          </div>

          {/* Lien du bot */}
          <div>
            <Label>Lien du bot de qualification</Label>
            <div className="flex items-center space-x-2 mt-2">
              <Input value={botLink} readOnly className="bg-gray-50" />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(botLink, 'Lien du bot')}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(botLink, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Réseaux sociaux */}
          <div>
            <Label className="text-base font-semibold">Partager sur les réseaux sociaux</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {socialPlatforms.map((platform) => (
                <Button
                  key={platform.id}
                  onClick={platform.action}
                  className={`${platform.color} text-white flex flex-col items-center p-4 h-auto`}
                >
                  <platform.icon className="w-6 h-6 mb-2" />
                  <span className="text-sm">{platform.name}</span>
                </Button>
              ))}
            </div>

            {/* TikTok séparé car style différent */}
            <div className="mt-3">
              <Button
                onClick={shareToTikTok}
                className="w-full bg-black hover:bg-gray-800 text-white flex items-center justify-center p-4"
              >
                <div className="w-6 h-6 mr-2 bg-white text-black rounded flex items-center justify-center text-xs font-bold">
                  TT
                </div>
                <span>TikTok</span>
              </Button>
            </div>
          </div>

          {/* Partage direct par email */}
          <div>
            <Label className="text-base font-semibold">Envoyer par email</Label>
            <div className="flex items-center space-x-2 mt-3">
              <Input
                type="email"
                placeholder="destinataire@exemple.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
              <Button onClick={sendEmail} className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>Envoyer</span>
              </Button>
            </div>
          </div>

          {/* Partage direct par SMS */}
          <div>
            <Label className="text-base font-semibold">Envoyer par SMS</Label>
            <div className="flex items-center space-x-2 mt-3">
              <Input
                type="tel"
                placeholder="+33123456789"
                value={sharePhone}
                onChange={(e) => setSharePhone(e.target.value)}
              />
              <Button onClick={sendSMS} className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>Envoyer</span>
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Conseils de partage</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>WhatsApp/SMS:</strong> Partage direct avec le message</li>
              <li>• <strong>Facebook/Messenger:</strong> Ouverture du formulaire de partage</li>
              <li>• <strong>Instagram/TikTok:</strong> Message copié, à coller manuellement</li>
              <li>• <strong>Email:</strong> Ouverture de votre client email par défaut</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};