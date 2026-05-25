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
  const { profile, update } = useMobileProfile();
  const [name, setName] = useState("");

  useEffect(() => { if (profile) setName(profile.full_name ?? ""); }, [profile]);

  const save = async () => {
    await update({ full_name: name });
    toast.success("Profil mis à jour");
  };

  const logout = async () => {
    await signOut();
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.clear();
    } catch {}
    navigate("/app/auth", { replace: true });
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
          <Label>Nom complet</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Téléphone</Label>
          <Input value={profile?.phone ?? ""} disabled />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={profile?.email ?? ""} disabled />
        </div>
        <Button onClick={save} className="w-full bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)]">Enregistrer</Button>
        <Button onClick={logout} variant="outline" className="w-full text-destructive border-destructive/30">
          <LogOut className="h-4 w-4 mr-2" /> Se déconnecter
        </Button>
      </main>
    </div>
  );
}
