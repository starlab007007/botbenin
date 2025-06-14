
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAdvancedCampaignFeatures } from "@/hooks/useAdvancedCampaignFeatures";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CampaignSchedulerProps {
  campaignId?: string;
}

export const CampaignScheduler: React.FC<CampaignSchedulerProps> = ({ campaignId }) => {
  const { scheduledPosts, createScheduledPost, isLoading } = useAdvancedCampaignFeatures();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [form, setForm] = useState({
    platform: "",
    content: "",
    scheduledTime: "",
    mediaUrl: ""
  });

  const platforms = [
    { value: "facebook", label: "Facebook" },
    { value: "instagram", label: "Instagram" },
    { value: "twitter", label: "Twitter/X" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "tiktok", label: "TikTok" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !form.platform || !form.content || !selectedDate) {
      toast({ title: "Informations manquantes", variant: "destructive" });
      return;
    }

    const scheduledDateTime = new Date(selectedDate);
    if (form.scheduledTime) {
      const [hours, minutes] = form.scheduledTime.split(':');
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));
    }

    const result = await createScheduledPost({
      campaignId,
      platform: form.platform,
      content: form.content,
      scheduledAt: scheduledDateTime.toISOString(),
      mediaUrl: form.mediaUrl
    });

    if (result) {
      setForm({ platform: "", content: "", scheduledTime: "", mediaUrl: "" });
      setSelectedDate(undefined);
      setShowForm(false);
      toast({ title: "Post programmé", description: "Votre publication a été programmée avec succès." });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Planification des Publications
        </h3>
        <Button onClick={() => setShowForm(!showForm)} disabled={!campaignId}>
          <Plus className="w-4 h-4 mr-2" />
          Programmer
        </Button>
      </div>

      {!campaignId && (
        <Card className="p-4 text-center">
          <p className="text-gray-500">Sélectionnez une campagne pour programmer des publications.</p>
        </Card>
      )}

      {showForm && campaignId && (
        <Card>
          <CardHeader>
            <CardTitle>Programmer une publication</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Plateforme*</label>
                <Select value={form.platform} onValueChange={(value) => setForm(f => ({ ...f, platform: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une plateforme" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map(platform => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Contenu*</label>
                <textarea
                  className="w-full p-2 border rounded-md"
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Rédigez votre message..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date*</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : "Choisir une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Heure</label>
                  <Input
                    type="time"
                    value={form.scheduledTime}
                    onChange={(e) => setForm(f => ({ ...f, scheduledTime: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">URL du média (optionnel)</label>
                <Input
                  type="url"
                  value={form.mediaUrl}
                  onChange={(e) => setForm(f => ({ ...f, mediaUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="flex space-x-2">
                <Button type="submit">Programmer</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h4 className="font-medium">Publications programmées</h4>
        {scheduledPosts.map((post) => (
          <Card key={post.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                    {post.platform}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    post.status === 'posted' ? 'bg-green-100 text-green-700' :
                    post.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {post.status === 'posted' ? 'Publié' : 
                     post.status === 'scheduled' ? 'Programmé' : 'En attente'}
                  </span>
                </div>
                <p className="text-sm mb-2">{post.content}</p>
                <p className="text-xs text-gray-500">
                  {post.scheduledAt ? format(new Date(post.scheduledAt), "PPP à HH:mm", { locale: fr }) : 'Non programmé'}
                </p>
              </div>
            </div>
          </Card>
        ))}
        
        {scheduledPosts.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            Aucune publication programmée.
          </div>
        )}
      </div>
    </div>
  );
};
