import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw } from 'lucide-react';

interface UserUsage {
  id: string;
  user_id: string;
  year_month: string;
  images_created: number;
  flyers_created: number;
  videos_created: number;
  storage_used_mb: number;
  user: {
    email: string;
    id: string;
  };
}

interface IACreatorUsersTableProps {
  users: UserUsage[] | undefined;
  onResetUsage: (userId: string) => void;
}

export const IACreatorUsersTable: React.FC<IACreatorUsersTableProps> = ({
  users,
  onResetUsage,
}) => {
  if (!users || users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun utilisateur actif ce mois-ci
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead className="text-center">Images</TableHead>
            <TableHead className="text-center">Flyers</TableHead>
            <TableHead className="text-center">Vidéos</TableHead>
            <TableHead className="text-center">Stockage (MB)</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((userUsage) => (
            <TableRow key={userUsage.id}>
              <TableCell className="font-medium">
                {userUsage.user?.email || 'N/A'}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{userUsage.images_created}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{userUsage.flyers_created}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{userUsage.videos_created}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline">
                  {userUsage.storage_used_mb.toFixed(2)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onResetUsage(userUsage.user_id)}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Réinitialiser
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};