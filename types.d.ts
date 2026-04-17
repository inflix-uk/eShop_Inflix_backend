export interface ThumbnailImage {
  filename: string;
  path: string;
  url?: string;
  altText?: string;
  description?: string;
}
export interface CategoryData {
  _id: string;
  name: string;
  isPublish: boolean;
  isFeatured: boolean;
  subCategory: string[];
  order: number;
  createdAt: string;
}
export interface Product {
  _id: string;
  name: string;
  category: string;
  brand?: string;
  subCategory: string; // You might want to type this more specifically if needed
  condition: string;
  is_featured: boolean;
  thumbnail_image: ThumbnailImage;
  image?: ThumbnailImage | null; // For navbar suggestions
  createdAt: string;
  updatedAt: string;
  producturl: string;
  minPrice: number;
  minSalePrice: number;
  averageRating: number | null;
  hasStock?: boolean; // Indicates if product has any available variants
}
export interface ProductData {
  is_refundable: {
    status: boolean;
    refund_duration: number;
    refund_type: string;
  };
  description: string;
  comes_With: {
    powerAdapter: boolean;
    powerCable: boolean;
    protectionBundle: boolean;
    treePlanted: boolean;
    hdmi: boolean | null;
    powerCableNewIncluded: boolean | null;
    onexcontroller: boolean | null;
    twoxcontroller: boolean | null;
    freeSim: boolean;
    onexBackCover: boolean | null;
    onexScreenProtector: boolean | null;
  };
  thumbnail_image: {
    filename: string;
    path: string;
    url?: string;
    altText?: string;
    description?: string;
  };
  has_warranty: {
    status: boolean;
    has_replacement_warranty: boolean;
    Warranty_duration: number;
    Warranty_type: string;
  };
  productType: {
    type: string;
  };
  Seo_Meta: {
    metaTitle: string | null;
    metaDescription: string | null;
    metaKeywords: string | null;
    metaSchemas: any[];
  };
  _id: string;
  name: string;
  producturl: string;
  category: string;
  subCategory: string;
  brand: string;
  battery: string[];
  condition: string;
  tags: string;
  is_featured: boolean;
  is_authenticated: boolean;
  low_stock_quantity_alert: number | null;
  sim_options: string;
  product_Specifications: {
    key: string;
    value: string;
  }[];
  variantDescription: {
    condition: Record<string, string | string[]>;
    color: Record<string, string | string[]>;
    storage: Record<string, string | string[]>;
  }[];
  Gallery_Images: {
    filename: string;
    path: string;
    url?: string;
    altText?: string;
    description?: string;
  }[];
  variantValues: {
    metaImage: {
      filename: string;
      path: string;
    };
    name: string;
    variantImages: {
      filename: string;
      path: string;
    }[];
    Cost: number | null;
    Price: number;
    Quantity: number | null;
    SKU: string;
    EIN: string;
    MPN: string | null;
    salePrice: string;
    metaTitle: string;
    metaKeywords: string;
    metaSchemas: any[];
    metaDescription: string;
    _id: string;
  }[];
  variantNames: {
    name: string;
    options: string[];
    _id: string;
  }[];
  varImgGroup: {
    name: string;
    varImg: {
      filename: string;
      path: string;
    }[];
    _id: string;
  }[];
  Product_summary: string;
  Product_description: string;
  status: boolean;
  rating: number;
  createdAt: string;
  updatedAt: string;
  reviewDetails: any[];
  __v: number;
  seeAccessoriesWeDontNeed: boolean;
  isdeleted: boolean;
  faqDetails?: {
    question: string;
    answer: string;
    status?: string;
  }[];
  topSectionItems?: string[];
  topSectionItemsPopulated?: {
    slug: string;
    name: string;
    icon: string | null;
    description: string | null;
    image?: {
      filename?: string;
      path?: string;
      url?: string;
    } | null;
  }[];
  comesWithItemsPopulated?: {
    slug: string;
    name: string;
    icon: string | null;
    description: string | null;
    image?: {
      filename?: string;
      path?: string;
      url?: string;
    } | null;
  }[];
}
export interface SelectedVariant {
  metaImage: {
    filename: string;
    path: string;
  };
  name: string;
  variantImages: {
    filename: string;
    path: string;
  }[];
  Cost: number | null;
  Price: number;
  Quantity: number | null;
  SKU: string;
  EIN: string;
  MPN: string | null;
  salePrice: string;
  metaTitle: string;
  metaKeywords: string;
  metaSchemas: string[];
  metaDescription: string;
  _id: string;
}
export interface VariantDetails {
  metaImage: {
    filename: string;
    path: string;
  };
  name: string;
  variantImages: {
    filename: string;
    path: string;
  }[];
  Cost: number | null;
  Price: number;
  Quantity: number | null;
  SKU: string;
  EIN: string;
  MPN: string | null;
  salePrice: string;
  metaTitle: string;
  metaKeywords: string;
  metaSchemas: string[]; // Array of schema strings
  metaDescription: string;
  _id: string;
}
export interface ExtractedOptions {
  [key: string]: string;
  condition: string;
  color: string;
  storage: string;
}
export interface ConditionPrices {
  condition: string;
  price: number;
  salePrice: string;
}
export interface SelectedOptions {
  [key: string]: string;
  condition: string;
  color: string;
  storage: string;
}

export interface SelectedOptions {
  [variantName: string]: string;
}

export interface CartItem {
  _id: string;
  productName: string | undefined;
  qty: number;
  productId: string;
  salePrice: number;
  selectedSim: string;
  productthumbnail?: string;
  name: string;
  variantImages?: { filename?: string; path?: string; url?: string }[];
  galleryImages?: { filename?: string; path?: string; url?: string }[];
}


export interface Category {
  _id: string;
  name: string;
  bannerImage?: {
    path: string;
  };
  content?: string;
  metaTitle?: string;
  metaSchemas?: any[]; // Replace `any` with a more specific type if available
  metaDescription?: string;
  subCategory: string[];
  metasubCategory: {
    subcategoryName: string;
    metaTitle: string;
    metaDescription: string;
    content: string;
  }[];
}
export interface SortOption {
  name: string;
  key: string;
  sortFunc: (a: any, b: any) => number;
}

export interface Category {
  _id: string;
  name: string;
  isPublish: boolean;
  isFeatured: boolean;
  subCategory: string[];
  order: number;
  createdAt: string;
}
export interface NavbarCategory {
  categories: Category[]; // Add the missing data property
  loading: boolean;
  error: string | null;
}
export interface Blog {
  _id: string;
  permalink: string;
  slug?: string;
  name: string;
  title?: string;
  thumbnailImage: string;
  blogthumbnailImageAlt: string;
  content?: string;
  blogImage: string;
  blogImageAlt: string;
  blogShortDescription?: string;
  blogCategory: string;
  categories?: Array<string | { name: string }>;
  createdAt?: string;
  updatedAt?: string;
  blogpublisheddate: string;
  publishDate?: string;
  isNewBlog?: boolean;
  featuredImage?: string;
  featuredImageAlt?: string;
  featuredImageDescription?: string;
  bannerImage?: string;
  bannerImageAlt?: string;
  bannerImageDescription?: string;
}
export interface BlogData {
  _id: string;
  permalink: string;
  name: string;
  content: string;
  blogImage: string;
  blogImageAlt: string;
  blogShortDescription: string;
  blogCategory: string;
  createdAt: string;
  updatedAt: string;
  blogpublisheddate: string;
}
export interface Offer {
  id?: string | number; // ID from API (_id) or local
  coupontext?: string; // For Coupon type
  type: string;
  emoji: string;
  title: string;
  desc: string;
  expiry: string;
  startDate?: string; // Start date of the offer
  link?: string; // Make the link property optional
  buttonText?: string; // Custom button text for Deal type
}

// API Response interface for deals
export interface DealApiResponse {
  _id: string;
  title: string;
  desc: string;
  type: "Deal" | "Coupon";
  startDate: string;
  hasExpiry: boolean;
  expiryDate: string | null;
  expiryText: string;
  link: string | null;
  buttonText: string | null;
  couponCode: string | null;
  emoji: string;
  isExpired: boolean;
  isPublish: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
}


export interface User {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  firstname: string;
  lastname: string;
  companyname: string;
  phoneNumber: string;
  password: string;
  address: {
    address: string;
    apartment: string;
    city: string;
    country: string;
    state: string;
    county: string;
    postalCode: string;
  } 
  // add other fields depending on your user data
}


// Checkout types
export interface Address {
  address: string;
  apartment?: string;
  country: string;
  city: string;
  county?: string;
  postalCode: string;
}

export interface ShippingInformation {
  firstName: string;
  lastName: string;
  companyName: string;
  address: string;
  apartment: string;
  country: string;
  city: string;
  county: string;
  postalCode: string;
  phoneNumber: string;
}

export interface Errors {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  city: string;
  county: string;
  country: string;
  postalCode: string;
  password: string;
  confirmPassword: string;
  [key: string]: string;
}

export interface ContactInfo {
  email: string;
  userId: string;
}

export interface Coupon {
  code: string;
  discount_type: "flat" | "percentage";
  discount: number;
  upto?: number;
}

export interface ProductItem {
  _id: string;
  name: string;
  productName: string;
  salePrice: number;
  qty: number;
  variantImages?: { path: string }[];
  productthumbnail?: { path: string };
  selectedSim?: string;
}
// types/Product.ts

export interface VariantImage {
  path: string;
}

export interface ProductItem {
  _id: string;
  name: string;
  productName: string;
  salePrice: number;
  qty: number;
  variantImages?: VariantImage[];
  productthumbnail?: VariantImage;
  selectedSim?: string;
}

export interface Coupon {
  code: string;
  discount_type: 'flat' | 'percentage';
  discount: number;
  upto?: number;
}

export interface ProductDetailsProps {
  discountedPrice: number;
  products: ProductItem[];
  removeFromCart: (productId: string) => void;
  totalSalePrice: number;
  appliedCoupon?: Coupon | null;
  isChecked: boolean;
  handleTermsCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showWarning: boolean;
  enteredCoupon: string;
  handleCouponInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCouponValid: boolean;
  handleApplyCoupon: (e: React.MouseEvent<HTMLButtonElement>) => void;
  updateCheckoutSession: () => void;
}
// Loginn types
export interface Errors {
  email?: string;
  password?: string;
}

export interface LoginFormProps {
  toggleFormVisibility: () => void;
  showForm: boolean;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  handleLogin: () => void;
  errors: Errors;
}

export interface Window {
  dataLayer: any[];
}

// Klarna Web SDK custom elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'klarna-placement': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'data-key'?: string;
          'data-locale'?: string;
          'data-purchase-amount'?: string;
        },
        HTMLElement
      >;
    }
  }
}
