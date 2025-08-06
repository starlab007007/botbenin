import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  Star,
  User,
  Target,
  Clock,
  Tag,
  Edit,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Prospect {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  status: string;
  source?: string;
  notes?: string;
  tags?: any;
  score: number;
  created_at: string;
  updated_at: string;
  last_contact_date?: string;
  next_follow_up?: string;
}

interface ProspectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: Prospect | null;
  onEdit?: (prospect: Prospect) => void;
  onDelete?: (prospectId: string) => void;
}

export const ProspectDetailsModal: React.FC<ProspectDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  prospect,
  onEdit,
  onDelete 
}) => {
  if (!prospect) return null;

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      qualified: 'bg-purple-100 text-purple-800 border-purple-200',
      converted: 'bg-green-100 text-green-800 border-green-200',
      lost: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status as keyof typeof colors] || colors.new;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const handleContact = (method: 'email' | 'phone') => {
    if (method === 'email' && prospect.email) {
      window.open(`mailto:${prospect.email}`, '_blank');
    } else if (method === 'phone' && prospect.phone) {
      window.open(`tel:${prospect.phone}`, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">
                {prospect.first_name} {prospect.last_name}
              </DialogTitle>
              <DialogDescription className="flex items-center space-x-2 mt-2">
                {prospect.company && (
                  <>
                    <Building2 className="w-4 h-4" />
                    <span>{prospect.company}</span>
                    {prospect.position && <span>• {prospect.position}</span>}
                  </>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(prospect.status)}>
                {prospect.status}
              </Badge>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(prospect.score)}`}>
                {prospect.score}%
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informations principales */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Informations de contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {prospect.email && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{prospect.email}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleContact('email')}
                    >
                      Envoyer email
                    </Button>
                  </div>
                )}
                
                {prospect.phone && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{prospect.phone}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleContact('phone')}
                    >
                      Appeler
                    </Button>
                  </div>
                )}

                {prospect.company && (
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{prospect.company}</div>
                      {prospect.position && (
                        <div className="text-sm text-muted-foreground">{prospect.position}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {prospect.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{prospect.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {prospect.tags && Array.isArray(prospect.tags) && prospect.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Tag className="w-5 h-5 mr-2" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {prospect.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar avec métadonnées */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Score de qualification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${getScoreColor(prospect.score).split(' ')[0]}`}>
                    {prospect.score}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {prospect.score >= 80 ? 'Excellent prospect' :
                     prospect.score >= 60 ? 'Bon prospect' :
                     prospect.score >= 40 ? 'Prospect moyen' : 'Prospect faible'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Historique
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Créé</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(prospect.created_at), { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium">Dernière modification</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(prospect.updated_at), { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </div>
                </div>

                {prospect.source && (
                  <div>
                    <div className="text-sm font-medium">Source</div>
                    <div className="text-sm text-muted-foreground">{prospect.source}</div>
                  </div>
                )}

                {prospect.last_contact_date && (
                  <div>
                    <div className="text-sm font-medium">Dernier contact</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(prospect.last_contact_date), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </div>
                  </div>
                )}

                {prospect.next_follow_up && (
                  <div>
                    <div className="text-sm font-medium">Prochain suivi</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(prospect.next_follow_up), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => onEdit?.(prospect)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-red-600 hover:text-red-700"
                  onClick={() => onDelete?.(prospect.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};