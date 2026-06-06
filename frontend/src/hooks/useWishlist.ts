import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWishlistContext } from '../context/WishlistContext';

/**
 * Custom hook for managing wishlist state and toggle functionality
 * @param productIdOrProduct - The product ID (string) or full Product object to check/manage in wishlist
 * @returns Object with isWishlisted state and toggleWishlist function
 */
export function useWishlist(productIdOrProduct?: any) {
  const { isWishlisted, toggleWishlist: contextToggleWishlist } = useWishlistContext();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const productId = productIdOrProduct
    ? (typeof productIdOrProduct === 'string' ? productIdOrProduct : String(productIdOrProduct.id || productIdOrProduct._id))
    : undefined;

  const productObject = productIdOrProduct && typeof productIdOrProduct !== 'string'
    ? productIdOrProduct
    : { id: productId, _id: productId };

  const isCurrentWishlisted = productId ? isWishlisted(productId) : false;

  const toggleWishlist = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      if ('preventDefault' in e) e.preventDefault();
      if ('stopPropagation' in e) e.stopPropagation();
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!productId) {
      console.error('Product ID or product object is required to toggle wishlist');
      return;
    }

    await contextToggleWishlist(productObject);
  };

  return { isWishlisted: isCurrentWishlisted, toggleWishlist };
}


