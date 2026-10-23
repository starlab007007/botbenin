import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { useMobileProfile } from "../hooks/useMobileProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { signOut } = useMobileAuth();
  const { profile, loading, update } = useMobileProfile();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (profile) setName(profile.full_name ?? ""); }, [profile]);

  const save = async () => {
    if (saving || loading || !profile) return;
    setSaving(true);
    try {
      await update({ full_name: name.trim() });
      toast.success("Profil mis à jour");
    } catch {
      toast.error("Profil non enregistré. Vos modifications sont conservées, réessayez.");
    } finally { setSaving(false); }
  };

  const logout = async () => {
    const { error } = await signOut();
    if (error) {
      console.error("[Profile] sign-out failed", error);
      toast.error("Déconnexion impossible. Réessayez dans quelques instants.");
      return;
    }
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.clear();
    } catch {}
    toast.success("Vous êtes déconnecté. La consultation reste disponible.");
    navigate("/app/chat", { replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 bg-[hsl(165_91%_18%)] text-white px-2 py-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/15"><ArrowLeft /></Button>
        <h1 className="text-lg font-bold">Mon profil</h1>
      </header>
      <main className="p-4 space-y-5">
        <div className="flex flex-col items-center pt-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[hsl(165_91%_25%)] text-white text-2xl">
              {(profile?.full_name ?? profile?.phone ?? "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <div>
          <Label htmlFor="profile-full-name">Nom complet</Label>
          <Input id="profile-full-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Téléphone</Label>
          <Input value={profile?.phone ?? ""} disabled />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={profile?.email ?? ""} disabled />
        </div>
        <Button onClick={save} disabled={saving || loading || !profile} className="w-full bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)]">{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        <Button onClick={logout} variant="outline" className="w-full text-destructive border-destructive/30">
          <LogOut className="h-4 w-4 mr-2" /> Se déconnecter
        </Button>
      </main>
    </div>
  );
}
