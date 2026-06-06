import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useLocation } from '../hooks/useLocation';
import { Product } from '../types/domain';
import { getWishlist, addToWishlist, removeFromWishlist } from '../services/api/customerWishlistService';

interface WishlistContextType {
  wishlistItems: Product[];
  wishlistIds: Set<string>;
  loading: boolean;
  fetchWishlist: () => Promise<void>;
  toggleWishlist: (product: any) => Promise<boolean>;
  isWishlisted: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { location } = useLocation();
  const { showToast } = useToast();

  // Create a Set of IDs for fast O(1) checks
  const wishlistIds = useMemo(() => {
    return new Set(wishlistItems.map(p => String(p.id || p._id)));
  }, [wishlistItems]);

  const fetchWishlist = async () => {
    if (!isAuthenticated) {
      setWishlistItems([]);
      return;
    }

    try {
      setLoading(true);
      let lat = location?.latitude;
      let lng = location?.longitude;

      // Fallback to localStorage coordinates if context location is not loaded yet
      if (!lat || !lng) {
        const cached = localStorage.getItem('userLocation');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.latitude && parsed.longitude) {
              lat = parsed.latitude;
              lng = parsed.longitude;
            }
          } catch (e) {
            console.error('[WishlistContext] Failed to parse cached location:', e);
          }
        }
      }

      const res = await getWishlist({
        latitude: lat,
        longitude: lng
      });

      if (res.success && res.data) {
        const validProducts = (res.data.products || []).filter((p: any) => p !== null && p !== undefined);
        const mappedProducts = validProducts.map((p: any) => ({
          ...p,
          id: p._id || p.id,
          name: p.productName || p.name,
          imageUrl: p.mainImageUrl || p.mainImage || p.imageUrl,
          price: p.price || p.variations?.[0]?.price || 0,
          pack: p.pack || p.variations?.[0]?.name || 'Standard'
        }));
        setWishlistItems(mappedProducts);
      }
    } catch (error) {
      console.error('[WishlistContext] Failed to fetch wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch wishlist on authentication or location changes
  useEffect(() => {
    fetchWishlist();
  }, [isAuthenticated, location?.latitude, location?.longitude]);

  const toggleWishlist = async (product: any): Promise<boolean> => {
    if (!isAuthenticated) {
      return false;
    }

    const productId = String(product._id || product.id);
    const isCurrentlyWishlisted = wishlistIds.has(productId);

    // Save state for potential rollback
    const previousItems = [...wishlistItems];

    // Optimistic Update
    if (isCurrentlyWishlisted) {
      // Remove item optimistically
      setWishlistItems(prev => prev.filter(p => String(p.id || p._id) !== productId));
      
      try {
        await removeFromWishlist(productId);
        showToast('Removed from wishlist');
        return true;
      } catch (error: any) {
        console.error('[WishlistContext] Failed to remove from wishlist:', error);
        // Rollback state on failure
        setWishlistItems(previousItems);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update wishlist';
        showToast(errorMessage, 'error');
        return false;
      }
    } else {
      // Add item optimistically
      let lat = location?.latitude;
      let lng = location?.longitude;

      if (!lat || !lng) {
        const cached = localStorage.getItem('userLocation');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.latitude && parsed.longitude) {
              lat = parsed.latitude;
              lng = parsed.longitude;
            }
          } catch (e) {
            console.error('[WishlistContext] Failed to parse cached location:', e);
          }
        }
      }

      if (!lat || !lng) {
        showToast('Location is required to add items to wishlist', 'error');
        return false;
      }

      const normalizedProduct = {
        ...product,
        id: productId,
        name: product.name || product.productName || 'Product',
        imageUrl: product.imageUrl || product.mainImageUrl || product.mainImage,
        price: product.price || product.variations?.[0]?.price || 0,
        pack: product.pack || product.variations?.[0]?.name || 'Standard'
      };

      setWishlistItems(prev => [...prev, normalizedProduct]);

      try {
        const res = await addToWishlist(productId, lat, lng);
        showToast('Added to wishlist');
        // Synchronize with returned populated products if possible
        if (res.success && res.data && res.data.products) {
          const validProducts = (res.data.products || []).filter((p: any) => p !== null && p !== undefined);
          const mappedProducts = validProducts.map((p: any) => ({
            ...p,
            id: p._id || p.id,
            name: p.productName || p.name,
            imageUrl: p.mainImageUrl || p.mainImage || p.imageUrl,
            price: p.price || p.variations?.[0]?.price || 0,
            pack: p.pack || p.variations?.[0]?.name || 'Standard'
          }));
          setWishlistItems(mappedProducts);
        }
        return true;
      } catch (error: any) {
        console.error('[WishlistContext] Failed to add to wishlist:', error);
        // Rollback state on failure
        setWishlistItems(previousItems);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update wishlist';
        showToast(errorMessage, 'error');
        return false;
      }
    }
  };

  const isWishlisted = (productId: string) => {
    return wishlistIds.has(String(productId));
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistIds,
        loading,
        fetchWishlist,
        toggleWishlist,
        isWishlisted
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlistContext() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlistContext must be used within a WishlistProvider');
  }
  return context;
}
