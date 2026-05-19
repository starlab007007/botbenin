import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ALL_PERMISSIONS, useWaouhPartnerPermissions } from '@/hooks/useWaouhPartnerPermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function PartnerPermissionsMatrix({ partnerId }: { partnerId: string }) {
  const { perms, toggle, loading } = useWaouhPartnerPermissions(partnerId);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Habilitations</CardTitle>
        <CardDescription>Définissez les actions autorisées pour ce partenaire</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ALL_PERMISSIONS.map(p => (
          <div key={p.value} className="flex items-center justify-between rounded-md border p-2">
            <Label htmlFor={`perm-${p.value}`} className="text-sm cursor-pointer">{p.label}</Label>
            <Switch
              id={`perm-${p.value}`}
              checked={perms.has(p.value)}
              disabled={loading}
              onCheckedChange={(c) => toggle(p.value, !!c)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
