import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save } from 'lucide-react';

interface UsageLimits {
  id: string;
  plan_name: string;
  monthly_images: number;
  monthly_flyers: number;
  monthly_videos: number;
  storage_gb: number;
  is_unlimited: boolean;
}

interface IACreatorLimitsConfigProps {
  limits: UsageLimits[] | undefined;
  onUpdateLimits: (planName: string, limits: Partial<UsageLimits>) => void;
}

export const IACreatorLimitsConfig: React.FC<IACreatorLimitsConfigProps> = ({
  limits,
  onUpdateLimits,
}) => {
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<UsageLimits>>({});

  if (!limits || limits.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Aucune limite configurée</div>;
  }

  const handleEdit = (plan: UsageLimits) => {
    setEditingPlan(plan.plan_name);
    setEditValues({
      monthly_images: plan.monthly_images,
      monthly_flyers: plan.monthly_flyers,
      monthly_videos: plan.monthly_videos,
      storage_gb: plan.storage_gb,
    });
  };

  const handleSave = (planName: string) => {
    onUpdateLimits(planName, editValues);
    setEditingPlan(null);
    setEditValues({});
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan</TableHead>
            <TableHead className="text-center">Images/mois</TableHead>
            <TableHead className="text-center">Flyers/mois</TableHead>
            <TableHead className="text-center">Vidéos/mois</TableHead>
            <TableHead className="text-center">Stockage (GB)</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {limits.map((limit) => {
            const isEditing = editingPlan === limit.plan_name;
            return (
              <TableRow key={limit.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {limit.plan_name}
                    {limit.is_unlimited && (
                      <Badge variant="secondary">Illimité</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {isEditing && !limit.is_unlimited ? (
                    <Input
                      type="number"
                      value={editValues.monthly_images || 0}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          monthly_images: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-20 text-center"
                    />
                  ) : (
                    <span>{limit.is_unlimited ? '∞' : limit.monthly_images}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {isEditing && !limit.is_unlimited ? (
                    <Input
                      type="number"
                      value={editValues.monthly_flyers || 0}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          monthly_flyers: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-20 text-center"
                    />
                  ) : (
                    <span>{limit.is_unlimited ? '∞' : limit.monthly_flyers}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {isEditing && !limit.is_unlimited ? (
                    <Input
                      type="number"
                      value={editValues.monthly_videos || 0}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          monthly_videos: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-20 text-center"
                    />
                  ) : (
                    <span>{limit.is_unlimited ? '∞' : limit.monthly_videos}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={editValues.storage_gb || 0}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          storage_gb: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-20 text-center"
                    />
                  ) : (
                    <span>{limit.storage_gb}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <Button
                      size="sm"
                      onClick={() => handleSave(limit.plan_name)}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Sauvegarder
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(limit)}
                    >
                      Modifier
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};