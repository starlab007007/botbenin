import React, { useState } from 'react';
import { FileUp, Plus, Trash2, ArrowLeft, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProductManualImportProps {
  ownerId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const PRODUCT_TEMPLATES = [
  {
    id: 'electronics',
    name: 'Électronique',
    fields: ['Marque', 'Modèle', 'Garantie', 'État']
  },
  {
    id: 'clothing',
    name: 'Vêtements',
    fields: ['Taille', 'Couleur', 'Matière', 'Marque']
  },
  {
    id: 'food',
    name: 'Alimentation',
    fields: ['Date d\'expiration', 'Origine', 'Poids', 'Conservation']
  },
  {
    id: 'general',
    name: 'Produit Général',
    fields: ['Type', 'Dimensions', 'Poids', 'Matériau']
  }
];

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

export const ProductManualImport: React.FC<ProductManualImportProps> = ({
  ownerId,
  onSuccess,
  onCancel
}) => {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [products, setProducts] = useState<any[]>([{
    name: '',
    description: '',
    price: '',
    currency: 'XOF',
    category: '',
    sku: '',
    stock_quantity: '',
    characteristics: {},
    images: []
  }]);
  const [saving, setSaving] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  const currentProduct = products[currentProductIndex];
  const templateFields = PRODUCT_TEMPLATES.find(t => t.id === selectedTemplate)?.fields || [];

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = PRODUCT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      const newChars: Record<string, string> = {};
      template.fields.forEach(field => {
        newChars[field] = '';
      });
      updateProduct(currentProductIndex, { characteristics: newChars });
    }
  };

  const updateProduct = (index: number, updates: any) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], ...updates };
    setProducts(newProducts);
  };

  const updateCharacteristic = (key: string, value: string) => {
    const newChars = { ...currentProduct.characteristics, [key]: value };
    updateProduct(currentProductIndex, { characteristics: newChars });
  };

  const addProduct = () => {
    setProducts([...products, {
      name: '',
      description: '',
      price: '',
      currency: 'XOF',
      category: '',
      sku: '',
      stock_quantity: '',
      characteristics: {},
      images: []
    }]);
    setCurrentProductIndex(products.length);
  };

  const removeProduct = (index: number) => {
    if (products.length === 1) {
      toast({
        title: "Erreur",
        description: "Il faut au moins un produit",
        variant: "destructive"
      });
      return;
    }
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
    if (currentProductIndex >= newProducts.length) {
      setCurrentProductIndex(newProducts.length - 1);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + currentProduct.images.length > 3) {
      toast({
        title: "Limite atteinte",
        description: "Maximum 3 photos par produit",
        variant: "destructive"
      });
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateProduct(currentProductIndex, {
          images: [...currentProduct.images, reader.result as string]
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (imageIndex: number) => {
    const newImages = currentProduct.images.filter((_: any, i: number) => i !== imageIndex);
    updateProduct(currentProductIndex, { images: newImages });
  };

  const validateProducts = () => {
    for (let i = 0; i < products.length; i++) {
      if (!products[i].name) {
        toast({
          title: "Erreur de validation",
          description: `Le produit ${i + 1} doit avoir un nom`,
          variant: "destructive"
        });
        setCurrentProductIndex(i);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateProducts()) return;

    setSaving(true);
    try {
      const productsToInsert = products.map(p => ({
        owner_id: ownerId,
        name: p.name,
        description: p.description || null,
        price: p.price ? parseFloat(p.price) : null,
        currency: p.currency,
        category: p.category || null,
        sku: p.sku || null,
        stock_quantity: p.stock_quantity ? parseInt(p.stock_quantity) : 0,
        images: p.images,
        characteristics: p.characteristics,
        is_active: true
      }));

      const { error } = await supabase
        .from('products')
        .insert(productsToInsert);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `${products.length} produit(s) enregistré(s)`
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Import Manuel de Produits</CardTitle>
            <CardDescription>Sélectionnez un template et remplissez les informations</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selection */}
        <div>
          <Label>Sélectionner un template</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un type de produit" />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_TEMPLATES.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product Navigation */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Produit {currentProductIndex + 1} sur {products.length}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentProductIndex(Math.max(0, currentProductIndex - 1))}
              disabled={currentProductIndex === 0}
            >
              Précédent
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentProductIndex(Math.min(products.length - 1, currentProductIndex + 1))}
              disabled={currentProductIndex === products.length - 1}
            >
              Suivant
            </Button>
            <Button size="sm" onClick={addProduct}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
            {products.length > 1 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => removeProduct(currentProductIndex)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Product Form */}
        <div className="space-y-4">
          {/* Images */}
          <div>
            <Label>Photos (Max 3)</Label>
            <div className="grid grid-cols-3 gap-4 mt-2">
              {currentProduct.images.map((img: string, idx: number) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border-2">
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
              {currentProduct.images.length < 3 && (
                <label className="aspect-square rounded-lg border-2 border-dashed hover:border-primary cursor-pointer flex flex-col items-center justify-center gap-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Ajouter</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nom du produit *</Label>
              <Input
                value={currentProduct.name}
                onChange={(e) => updateProduct(currentProductIndex, { name: e.target.value })}
                placeholder="Nom du produit"
              />
            </div>

            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea
                value={currentProduct.description}
                onChange={(e) => updateProduct(currentProductIndex, { description: e.target.value })}
                placeholder="Description"
                rows={3}
              />
            </div>

            <div>
              <Label>Prix</Label>
              <Input
                type="number"
                value={currentProduct.price}
                onChange={(e) => updateProduct(currentProductIndex, { price: e.target.value })}
              />
            </div>

            <div>
              <Label>Devise</Label>
              <Select 
                value={currentProduct.currency} 
                onValueChange={(v) => updateProduct(currentProductIndex, { currency: v })}
              >
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
              <Select 
                value={currentProduct.category} 
                onValueChange={(v) => updateProduct(currentProductIndex, { category: v })}
              >
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
              <Label>SKU</Label>
              <Input
                value={currentProduct.sku}
                onChange={(e) => updateProduct(currentProductIndex, { sku: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label>Quantité en stock</Label>
              <Input
                type="number"
                value={currentProduct.stock_quantity}
                onChange={(e) => updateProduct(currentProductIndex, { stock_quantity: e.target.value })}
              />
            </div>
          </div>

          {/* Template Fields */}
          {templateFields.length > 0 && (
            <div className="space-y-3">
              <Label>Caractéristiques ({selectedTemplate})</Label>
              {templateFields.map(field => (
                <div key={field}>
                  <Label className="text-sm">{field}</Label>
                  <Input
                    value={currentProduct.characteristics[field] || ''}
                    onChange={(e) => updateCharacteristic(field, e.target.value)}
                    placeholder={field}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : `Enregistrer ${products.length} produit(s)`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};