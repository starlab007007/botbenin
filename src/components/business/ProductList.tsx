import React from 'react';
import { Package, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProductListProps {
  products: any[];
  loading: boolean;
  onRefresh: () => void;
}

export const ProductList: React.FC<ProductListProps> = ({ products, loading, onRefresh }) => {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucun produit</h3>
        <p className="text-muted-foreground mb-4">Commencez par ajouter votre premier produit</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <div key={product.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
          {/* Image */}
          <div className="aspect-square bg-muted relative">
            {product.images && product.images.length > 0 ? (
              <img 
                src={product.images[0]} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            {product.images && product.images.length > 1 && (
              <Badge className="absolute top-2 right-2">
                +{product.images.length - 1}
              </Badge>
            )}
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            <div>
              <h3 className="font-semibold line-clamp-1">{product.name}</h3>
              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {product.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                {product.price && (
                  <p className="text-lg font-bold">
                    {product.price} {product.currency}
                  </p>
                )}
                {product.category && (
                  <Badge variant="secondary" className="mt-1">
                    {product.category}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Stock: {product.stock_quantity || 0}
              </div>
            </div>

            {product.sku && (
              <div className="text-xs text-muted-foreground">
                SKU: {product.sku}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button size="sm" variant="ghost" className="flex-1">
                <Eye className="w-4 h-4 mr-1" />
                Voir
              </Button>
              <Button size="sm" variant="ghost" className="flex-1">
                <Edit className="w-4 h-4 mr-1" />
                Modifier
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};