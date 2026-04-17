"use client";
import {
  Fragment,
  useState,
  useEffect,
  useMemo,
  memo,
  useCallback,
} from "react";
import { toast } from "react-toastify";
// import dynamic from "next/dynamic";
import {
  Dialog,
  Transition,
  DialogPanel,
  DialogTitle,
  TransitionChild,
} from "@headlessui/react";
// const Dialog = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.Dialog)
// );
// const DialogTitle = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.Dialog.Title)
// );
// const Transition = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.Transition)
// );
// const TransitionChild = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.Transition.Child)
// );
// const DialogPanel = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.Dialog.Panel)
// );
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/app/context/Auth";
import Image from "next/image";

interface Product {
  _id: string;
  productId?: string;
  name: string;
  salePrice: number;
  qty: number;
  productName: string;
  variantImages?: { path?: string; url?: string }[];
  galleryImages?: { path?: string; url?: string }[];
  productthumbnail?: string;
  selectedSim?: string;
}

interface NavbarCartProps {
  openCart: boolean;
  setOpenCart: React.Dispatch<React.SetStateAction<boolean>>;
  setCartItemCount: React.Dispatch<React.SetStateAction<number>>;
}

const NavbarCart = ({
  openCart,
  setOpenCart,
  setCartItemCount,
}: NavbarCartProps) => {
  const auth = useAuth();
  const [productsdata, setProductsData] = useState<Product[]>([]);
  const [stockData, setStockData] = useState<
    Record<string, { availableQuantity: number; inStock: boolean }>
  >({});

  // Calculate total price using useMemo
  const totalSalePrice = useMemo(() => {
    return productsdata
      .reduce((total, product) => {
        return total + parseFloat((product.salePrice * product.qty).toFixed(2));
      }, 0)
      .toFixed(2);
  }, [productsdata]);

  // Update cart quantity
  const updateCartItemCount = useCallback(
    (cart: Product[]) => {
      const count = cart.reduce((total, item) => total + (item.qty || 1), 0);
      setCartItemCount(count);
    },
    [setCartItemCount]
  );

  // Check stock for all products
  const checkAllStock = useCallback(async () => {
    if (productsdata.length === 0) return;

    const stockChecks: Record<
      string,
      { availableQuantity: number; inStock: boolean }
    > = {};

    for (const prod of productsdata) {
      try {
        const response = await fetch("/api/stock/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: prod.productId || prod._id,
            variantId: prod._id,
          }),
        });

        const data = await response.json();

        if (data.success && data.data) {
          stockChecks[prod._id] = {
            availableQuantity: data.data.availableQuantity,
            inStock: data.data.inStock,
          };
        } else {
          stockChecks[prod._id] = {
            availableQuantity: 0,
            inStock: false,
          };
        }
      } catch (error) {
        console.error(`Error checking stock for ${prod._id}:`, error);
        stockChecks[prod._id] = {
          availableQuantity: 0,
          inStock: false,
        };
      }
    }

    setStockData(stockChecks);
  }, [productsdata]);

  const updateCartQuantity = (productId: string, quantity: string) => {
    const newQty = parseInt(quantity, 10);
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const productIndex = cart.findIndex(
      (product: Product) => product._id === productId
    );

    const stock = stockData[productId];

    // Validate against stock
    if (stock) {
      if (newQty > stock.availableQuantity) {
        toast.warning(
          `Only ${stock.availableQuantity} item${
            stock.availableQuantity === 1 ? '' : 's'
          } available in stock.`
        );
        // Set to max available
        if (productIndex !== -1) {
          cart[productIndex].qty = stock.availableQuantity;
          localStorage.setItem("cart", JSON.stringify(cart));
          setProductsData(cart);
          updateCartItemCount(cart);
          window.dispatchEvent(new Event('cartUpdated'));
        }
        return;
      }
    }

    // Update normally if validation passes
    if (productIndex !== -1) {
      cart[productIndex].qty = newQty < 1 ? 1 : newQty;
      localStorage.setItem("cart", JSON.stringify(cart));
      setProductsData(cart);
      updateCartItemCount(cart);
      // Dispatch event to notify other components
      window.dispatchEvent(new Event("cartUpdated"));
    }
  };

  const removeFromCart = (productId: string) => {
    let cart = JSON.parse(localStorage.getItem("cart") || "[]");
    cart = cart.filter((product: Product) => product._id !== productId);
    localStorage.setItem("cart", JSON.stringify(cart));
    setProductsData(cart);
    updateCartItemCount(cart);
    // Dispatch event to notify other components
    window.dispatchEvent(new Event("cartUpdated"));
  };

  // Fetch cart data on mount
  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    setProductsData(cart);
    updateCartItemCount(cart);
  }, [updateCartItemCount]); // Include updateCartItemCount in the dependency array

  // Refresh cart data when cart modal opens
  useEffect(() => {
    if (openCart) {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      setProductsData(cart);
      updateCartItemCount(cart);
    }
  }, [openCart, updateCartItemCount]);

  // Check stock when cart opens or products change
  useEffect(() => {
    if (openCart && productsdata.length > 0) {
      checkAllStock();
    }
  }, [openCart, productsdata, checkAllStock]);

  // Product list component (memoized for performance)
  const ProductItem = memo(({ product }: { product: Product }) => {
    const productName = product.name;
    const modifiedProductName = productName.replace(/\s*\([^)]+\)/, ""); // remove everything inside parentheses
    const finalProductName = modifiedProductName.replace(/\s+/g, "-");
    const stock = stockData[product._id];

    // Helper function to get image URL
    const getProductImage = () => {
      // Check variant images first (prefer url for Vercel Blob, fallback to path)
      if (product.variantImages && product.variantImages.length > 0) {
        const img = product.variantImages[0];
        if (img.url) return img.url;
        if (img.path) return `${auth.ip}${img.path}`;
      }
      // Check gallery images as fallback
      if (product.galleryImages && product.galleryImages.length > 0) {
        const img = product.galleryImages[0];
        if (img.url) return img.url;
        if (img.path) return `${auth.ip}${img.path}`;
      }
      // Check product thumbnail
      if (product.productthumbnail) {
        return `${auth.ip}uploads/products/${product.productthumbnail}`;
      }
      // Final fallback
      return "/placeholder.png";
    };

    return (
      <li className="flex py-6" key={product._id}>
        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
          <Image
            loading="lazy"
            src={getProductImage()}
            alt={product.name}
            width={100}
            height={100}
            className="h-full w-full object-cover object-center"
          />
        </div>
        <div className="ml-4 flex flex-1 flex-col">
          <p>
            {product.productName} {finalProductName}{" "}
            {product.selectedSim && (
              <span className="text-sm text-gray-700">
                SIM: {product.selectedSim}
              </span>
            )}
          </p>
          <div className="flex flex-1 items-end justify-between text-sm">
            <div className="flex flex-col">
              <p className="text-gray-500">
                Qty
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  className="ml-2 w-16 rounded-md border border-gray-300 text-center text-sm font-medium text-gray-700 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                  value={product.qty}
                  min="1"
                  max={stock?.availableQuantity || 100}
                  onChange={(e) =>
                    updateCartQuantity(product._id, e.target.value)
                  }
                />
              </p>
              {/* {stock && stock.availableQuantity <= 5 && stock.inStock && (
                <span className="text-xs text-orange-600 mt-1">
                  Only {stock.availableQuantity} left in stock
                </span>
              )} */}
              {stock && !stock.inStock && (
                <span className="text-xs text-red-600 mt-1">Out of stock</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium text-gray-900">
                £ {parseFloat((product.salePrice * product.qty).toFixed(2))}
              </p>
              <button
                type="button"
                className="font-medium text-primary hover:text-green-500"
                onClick={() => removeFromCart(product._id)}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </li>
    );
  });
  ProductItem.displayName = "ProductItem";
  return (
    <Transition show={openCart} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => setOpenCart(false)}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-in-out duration-500"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-500"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </TransitionChild>
        <div className="fixed inset-0">
          <div className="absolute inset-0">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full">
              <TransitionChild
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <DialogPanel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white py-6 shadow-xl px-4">
                    <>
                      <div className="flex items-start justify-between">
                        <DialogTitle className="text-lg font-medium text-gray-900">
                          Shopping Cart
                        </DialogTitle>
                        <button
                          type="button"
                          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          onClick={() => setOpenCart(false)}
                        >
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                    </>
                    <div className="mt-4 px-4 overflow-y-auto scrollbar-thin scrollbar-webkit">
                      {productsdata.length === 0 ? (
                        <p className="text-center">Your cart is empty!</p>
                      ) : (
                        <ul className="divide-y divide-gray-200">
                          {productsdata.map((prod) => (
                            <ProductItem key={prod._id} product={prod} />
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="border-t border-gray-200 px-4 py-6 sm:px-6 sticky w-full bottom-0 bg-white">
                      <div className="flex justify-between text-base font-medium text-gray-900">
                        <p>Subtotal</p>
                        <p>£ {totalSalePrice}</p>
                      </div>
                      <p className="text-sm text-gray-500">
                        Shipping and taxes calculated at checkout.
                      </p>
                      <div className="mt-6">
                        <Link
                          href="/checkout"
                          className="flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-secondary"
                          prefetch={true}
                        >
                          Checkout
                        </Link>
                      </div>
                      <div className="mt-6 flex justify-center text-center text-sm text-gray-500">
                        <p>
                          or{" "}
                          <button
                            type="button"
                            className="font-medium text-primary hover:text-green-500"
                            onClick={() => setOpenCart(false)}
                          >
                            Continue Shopping &rarr;
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default NavbarCart;
