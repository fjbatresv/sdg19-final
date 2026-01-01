/**
 * Product entry shared between backend and web clients.
 */
export interface Product {
  /** Product identifier. */
  id: string;
  /** Display name for the catalog. */
  name: string;
  /** Optional description shown in the UI. */
  description?: string;
  /** Optional image URL for the product. */
  imageUrl?: string;
  /** Price in cents. */
  price: number;
  /** Currency code for the price. */
  currency: string;
  /** Quantity available for purchase. */
  availableQuantity: number;
  /** Whether the product is currently in stock. */
  inStock: boolean;
}
