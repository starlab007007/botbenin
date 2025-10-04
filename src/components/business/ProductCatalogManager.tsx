import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductCaptureForm } from './ProductCaptureForm';
import { ProductManualImport } from './ProductManualImport';
import { ProductList } from './ProductList';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProductCatalogManagerProps {
  onBack?: () => void;
}

export const ProductCatalogManager: React.FC<ProductCatalogManagerProps> = ({ onBack }) => {
  const { toast } = useToast();
  const [view, setView] = useState<'list' | 'capture' | 'import'>('list');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    fetchOwnerId();
  }, []);

  useEffect(() => {
    if (ownerId) {
      fetchProducts();
    }
  }, [ownerId]);

  const fetchOwnerId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive"
      });
      return;
    }

    const { data: ownerData } = await supabase
      .from('bot_owners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (ownerData) {
      setOwnerId(ownerData.id);
    }
  };

  const fetchProducts = async () => {
    if (!ownerId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProductSaved = () => {
    fetchProducts();
    setView('list');
    toast({
      title: "Succès",
      description: "Produit enregistré avec succès"
    });
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!ownerId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Catalogue de Produits</h1>
            <p className="text-muted-foreground">Gérez vos produits avec capture photo ou import manuel</p>
          </div>
        </div>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Retour
          </Button>
        )}
      </div>

      {view === 'list' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Vos Produits</CardTitle>
                <CardDescription>{products.length} produits au catalogue</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setView('capture')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Capturer avec photo
                </Button>
                <Button variant="outline" onClick={() => setView('import')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Import manuel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Product List */}
            <ProductList 
              products={filteredProducts} 
              loading={loading}
              onRefresh={fetchProducts}
            />
          </CardContent>
        </Card>
      )}

      {view === 'capture' && (
        <ProductCaptureForm
          ownerId={ownerId}
          onSuccess={handleProductSaved}
          onCancel={() => setView('list')}
        />
      )}

      {view === 'import' && (
        <ProductManualImport
          ownerId={ownerId}
          onSuccess={handleProductSaved}
          onCancel={() => setView('list')}
        />
      )}
    </div>
  );
};