import { CartItem, ProductData } from "../../../../../types";

/**
 * Add a product variant to cart
 */
export const addToCart = (
  variant: { [x: string]: string; _id: string } | null | undefined,
  product: ProductData | undefined,
  selectedSim: string,
  updatedPrice: number
): CartItem[] => {
  const cart: CartItem[] = getCart();

  // Guard clause: Check if variant is null or undefined
  if (!variant) {
    console.error("Cannot add to cart: No variant selected");
    return cart;
  }

  // Check if the variant is already in the cart
  const existingProductIndex = cart.findIndex(
    (item: CartItem) => item._id === variant._id
  );

  if (existingProductIndex !== -1) {
    // Increment the quantity if the product is already in the cart
    cart[existingProductIndex].qty = (cart[existingProductIndex].qty || 1) + 1;
  } else {
    // Add the new product to the cart with an initial quantity of 1
    const cartItem: CartItem = {
      ...variant,
      productName: product?.name,
      qty: 1,
      productId: product?._id || "", // Ensure non-null string
      salePrice: updatedPrice,
      selectedSim: selectedSim, // Include the selected SIM option
      productthumbnail:
        product?.productType?.type === "single"
          ? product.thumbnail_image?.filename || ""
          : undefined,
      name: variant.name || "", // Include name from variant
      // Store gallery images as fallback when variant has no images
      galleryImages: product?.Gallery_Images || [],
    };
    cart.push(cartItem);
  }

  // Save the updated cart back to local storage
  saveCart(cart);

  return cart;
};

/**
 * Remove a product from cart
 */
export const removeFromCart = (id: string): CartItem[] => {
  let cart = getCart();
  cart = cart.filter((product: { _id: string }) => product._id !== id);
  saveCart(cart);
  return cart;
};

/**
 * Update quantity of a cart item
 */
export const updateCartQuantity = (quantity: number, id: string): CartItem[] => {
  const cart = getCart();
  const productIndex = cart.findIndex(
    (product: { _id: string }) => product._id === id
  );

  if (productIndex !== -1) {
    cart[productIndex].qty = parseInt(quantity.toString(), 10);
    saveCart(cart);
  }
  
  return cart;
};

/**
 * Calculate total sale price of products in cart
 */
export const calculateTotalSalePrice = (
  products: { salePrice: number; qty: number }[]
): string => {
  return products
    .reduce((total, product) => {
      return total + parseFloat((product.salePrice * product.qty).toFixed(2));
    }, 0)
    .toFixed(2);
};

/**
 * Get cart from local storage
 */
export const getCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem("cart") || "[]");
};

/**
 * Save cart to local storage and dispatch update event
 */
export const saveCart = (cart: CartItem[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem("cart", JSON.stringify(cart));
  // Dispatch custom event to notify other components
  window.dispatchEvent(new Event('cartUpdated'));
};
