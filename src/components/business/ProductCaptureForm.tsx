import React, { useState } from 'react';
import { Camera, X, Check, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CameraCapture } from './CameraCapture';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProductCaptureFormProps {
  ownerId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  'Électronique',
  'Vêtements',
  'Alimentation',
  'Maison & Jardin',
  'Beauté & Santé',
  'Sports & Loisirs',
  'Livres & Média',
  'Jouets & Jeux',
  'Automobile',
  'Autre'
];

export const ProductCaptureForm: React.FC<ProductCaptureFormProps> = ({
  ownerId,
  onSuccess,
  onCancel
}) => {
  const { toast } = useToast();
  const [cameraMode, setCameraMode] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'XOF',
    category: '',
    sku: '',
    stock_quantity: '',
    characteristics: {} as Record<string, string>
  });
  const [newCharKey, setNewCharKey] = useState('');
  const [newCharValue, setNewCharValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCapturePhoto = async (blob: Blob) => {
    if (images.length >= 3) {
      toast({
        title: "Limite atteinte",
        description: "Maximum 3 photos par produit",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImages([...images, reader.result as string]);
      setCameraMode(false);
    };
    reader.readAsDataURL(blob);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const addCharacteristic = () => {
    if (newCharKey && newCharValue) {
      setFormData({
        ...formData,
        characteristics: {
          ...formData.characteristics,
          [newCharKey]: newCharValue
        }
      });
      setNewCharKey('');
      setNewCharValue('');
    }
  };

  const removeCharacteristic = (key: string) => {
    const newChars = { ...formData.characteristics };
    delete newChars[key];
    setFormData({ ...formData, characteristics: newChars });
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: "Erreur",
        description: "Le nom du produit est requis",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('products')
        .insert({
          owner_id: ownerId,
          name: formData.name,
          description: formData.description || null,
          price: formData.price ? parseFloat(formData.price) : null,
          currency: formData.currency,
          category: formData.category || null,
          sku: formData.sku || null,
          stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 0,
          images: images,
          characteristics: formData.characteristics,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Produit enregistré avec succès"
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (cameraMode) {
    return (
      <CameraCapture
        onCapture={handleCapturePhoto}
        onClose={() => setCameraMode(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Nouveau Produit - Capture Photo</CardTitle>
            <CardDescription>Prenez jusqu'à 3 photos et complétez les informations</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Photos Section */}
        <div className="space-y-4">
          <Label>Photos du produit (Max 3)</Label>
          <div className="grid grid-cols-3 gap-4">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border-2 border-border">
                <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => removeImage(idx)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {images.length < 3 && (
              <button
                onClick={() => setCameraMode(true)}
                className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-2"
              >
                <Camera className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Prendre une photo</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nom du produit *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: iPhone 15 Pro"
            />
          </div>

          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description détaillée du produit"
              rows={3}
            />
          </div>

          <div>
            <Label>Prix</Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0"
            />
          </div>

          <div>
            <Label>Devise</Label>
            <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="XOF">XOF (CFA)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Catégorie</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>SKU / Référence</Label>
            <Input
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="REF-001"
            />
          </div>

          <div className="col-span-2">
            <Label>Quantité en stock</Label>
            <Input
              type="number"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>

        {/* Characteristics */}
        <div className="space-y-4">
          <Label>Caractéristiques</Label>
          
          {/* Existing characteristics */}
          {Object.entries(formData.characteristics).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <Input value={key} disabled className="flex-1" />
              <Input value={value} disabled className="flex-1" />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeCharacteristic(key)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {/* Add new characteristic */}
          <div className="flex items-center gap-2">
            <Input
              value={newCharKey}
              onChange={(e) => setNewCharKey(e.target.value)}
              placeholder="Nom (ex: Couleur)"
              className="flex-1"
            />
            <Input
              value={newCharValue}
              onChange={(e) => setNewCharValue(e.target.value)}
              placeholder="Valeur (ex: Noir)"
              className="flex-1"
            />
            <Button size="sm" onClick={addCharacteristic}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer le produit'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
