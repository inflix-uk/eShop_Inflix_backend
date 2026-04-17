"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fetchProducts } from "@/app/lib/features/products/getProductSlice";
import {
  fetchProductCategory,
  fetchCategoryCounts,
} from "@/app/lib/features/categories/categoriesSlice";
import { useAppDispatch, useAppSelector } from "./lib/hooks";
import ProductCardWithStock from "./components/ProductCardWithStock";
import {
  getBuyNowPayLater,
  getSellBuyCards,
  getTinyPhoneBanner,
  type BuyNowPayLater as BuyNowPayLaterType,
  type SellBuyCards as SellBuyCardsType,
  type TinyPhoneBanner as TinyPhoneBannerType,
} from "./services/promotionalSectionsService";
import axios from "axios";
import {
  getHomepageData,
  getHomepageNewsletterWidgetPublic,
  type HomepageBlock,
  type HomepageNewsletterSingleton,
} from "./services/homepageDataService";
import {
  getSiteWidgetSettingsPublic,
  type SiteWidgetVisibility,
} from "./services/siteWidgetSettingsService";
import {
  getTrustpilotSettings,
  type TrustpilotSettings,
} from "./services/trustpilotService";
import {
  getCategoryCardsSectionSettings,
  type CategoryCardsSectionSettings,
} from "./services/categoryCardsService";
import {
  getHomeNavLinksPublic,
  type HomeNavLink,
} from "./services/homeNavLinksService";
import { scheduleIdle } from "./lib/scheduleIdle";
import type { HomeServerCmsBundle } from "./lib/homeServerCms";

const DEFAULT_WIDGET_VISIBILITY: SiteWidgetVisibility = {
  sliderEnabled: true,
  newsletterEnabled: true,
  faqEnabled: true,
  videoEnabled: true,
  mapEnabled: true,
  galleryEnabled: true,
  iconBoxEnabled: true,
  testimonialsEnabled: true,
  trustpilotWidgetEnabled: true,
  siteBannersEnabled: true,
  categoryCardsEnabled: true,
  promotionalSectionsEnabled: true,
  latestBlogsEnabled: true,
  htmlCssEnabled: true,
};

const CategoriesCard = dynamic(() => import("./components/CategoriesCard"), {
  loading: () => (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6"
      aria-hidden
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[4/3] animate-pulse rounded-lg bg-gray-200"
        />
      ))}
    </div>
  ),
});

const SwiperComponent = dynamic(
  () => import("./components/SwiperComponent")
);

const HomepageContent = dynamic(
  () => import("./components/HomepageContent"),
  {
    loading: () => (
      <div className="animate-pulse space-y-4 mt-8" aria-hidden>
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    ),
  }
);

const HomepageQuickNav = dynamic(
  () => import("./components/HomepageQuickNav"),
  {
    loading: () => (
      <div className="h-14 animate-pulse bg-gray-100 rounded my-4" aria-hidden />
    ),
  }
);

const NewsletterSignupWidget = dynamic(
  () => import("@/app/(routes)/blogs/new/[slug]/NewsletterSignupWidget")
);

const CookieConsent = dynamic(
  () => import("./components/common/ConsentCookie")
);

const NewsletterSuccessModal = dynamic(
  () => import("./components/common/NewsletterSuccessModal"),
  { ssr: false }
);

export default function HomeClient({
  cmsPrefetch,
}: {
  cmsPrefetch?: HomeServerCmsBundle;
}) {
  const prefetched = cmsPrefetch !== undefined;
  const [latestProducts, setLatestProducts] = useState([]);
  const [_refurbishedProducts, setRefurbishedProducts] = useState<any[]>([]);
  const [featuredCategoryProducts, setFeaturedCategoryProducts] = useState<
    any[]
  >([]);
  const [tabletsAndIpadsProducts, setTabletsAndIpadsProducts] = useState<any[]>(
    []
  );
  const [laptopsAndMacbooksProducts, setLaptopsAndMacbooksProducts] = useState<
    any[]
  >([]);
  const [samsungProducts, setSamsungProducts] = useState<any[]>([]);
  const [gameConsolesProducts, setGameConsolesProducts] = useState<any[]>([]);
  const dispatch = useAppDispatch();
  const { products } = useAppSelector((state) => state.products);
  const newCategories = useAppSelector((state) => state.categories);
  const { categoryCounts, isCountsLoading } = useAppSelector(
    (state) => state.categories
  );
  const [showThankYou, setShowThankYou] = useState(false);
  const [showConsent, setShowConsent] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const category = "";

  /** Avoid re-dispatching thunks when lists stay empty — `isCountsLoading` toggles re-ran the effect and caused request storms. */
  const homeBootstrapRef = useRef({
    products: false,
    categories: false,
    counts: false,
  });

  const [_buyNowPayLater, setBuyNowPayLater] =
    useState<BuyNowPayLaterType | null>(() =>
      prefetched ? (cmsPrefetch!.buyNowPayLater ?? null) : null
    );
  const [_buyNowPayLaterLoading, setBuyNowPayLaterLoading] = useState(
    () => !prefetched
  );
  const [_sellBuyCards, setSellBuyCards] = useState<SellBuyCardsType | null>(
    () => (prefetched ? (cmsPrefetch!.sellBuyCards ?? null) : null)
  );
  const [_sellBuyCardsLoading, setSellBuyCardsLoading] = useState(
    () => !prefetched
  );
  const [_tinyPhoneBanner, setTinyPhoneBanner] =
    useState<TinyPhoneBannerType | null>(() =>
      prefetched ? (cmsPrefetch!.tinyPhoneBanner ?? null) : null
    );
  const [_tinyPhoneBannerLoading, setTinyPhoneBannerLoading] = useState(
    () => !prefetched
  );
  const [homepageBlocks, setHomepageBlocks] = useState<HomepageBlock[]>(() =>
    prefetched ? cmsPrefetch!.homepageBlocks : []
  );
  const [homepageBlocksLoading, setHomepageBlocksLoading] = useState(
    () => !prefetched
  );
  const [_trustpilotSettings, setTrustpilotSettings] =
    useState<TrustpilotSettings | null>(() =>
      prefetched ? (cmsPrefetch!.trustpilotSettings ?? null) : null
    );
  const [categoryCardsSection, setCategoryCardsSection] =
    useState<CategoryCardsSectionSettings>(() =>
      prefetched
        ? cmsPrefetch!.categoryCardsSection
        : {
            headingText: "Popular Categories",
            headingColor: "var(--secondary)",
            dividerColor: "#000000",
            sectionBackgroundColor: "",
          }
    );
  const [homeNavLinks, setHomeNavLinks] = useState<HomeNavLink[]>(() =>
    prefetched ? cmsPrefetch!.homeNavLinks : []
  );
  const [homeNewsletterWidget, setHomeNewsletterWidget] =
    useState<HomepageNewsletterSingleton | null>(() =>
      prefetched ? (cmsPrefetch!.newsletterWidget ?? null) : null
    );
  const [widgetVisibility, setWidgetVisibility] = useState<SiteWidgetVisibility>(
    () =>
      prefetched ? cmsPrefetch!.widgetVisibility : DEFAULT_WIDGET_VISIBILITY
  );

  const fetchLatestProducts = useCallback(async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/get/latest/products/homepage`
      );
      return response.data.products;
    } catch (error) {
      console.error("Error fetching latest products:", error);
      return [];
    }
  }, []);

  // Generic function to fetch display products by category name
  const fetchCategoryDisplayProducts = useCallback(async (categoryName: string) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/category/display-products/name/${encodeURIComponent(categoryName)}`
      );
      return response.data.products || [];
    } catch (error) {
      console.error(`Error fetching ${categoryName} products:`, error);
      return [];
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const getProducts = async () => {
      const latestProducts = await fetchLatestProducts();
      // Fetch all display products from admin-selected products
      const refurbishedList = await fetchCategoryDisplayProducts("Refurbished");
      const tabletsAndIpadsProducts = await fetchCategoryDisplayProducts("iPads-and-Tablets");
      const laptopsAndMacbooksProducts = await fetchCategoryDisplayProducts("Laptops-and-Macbooks");
      const samsungProducts = await fetchCategoryDisplayProducts("Samsung");
      const gameConsolesProducts = await fetchCategoryDisplayProducts("Game-Consoles");

      setLatestProducts(latestProducts);
      setRefurbishedProducts(refurbishedList);
      setTabletsAndIpadsProducts(tabletsAndIpadsProducts);
      setLaptopsAndMacbooksProducts(laptopsAndMacbooksProducts);
      setSamsungProducts(samsungProducts);
      setGameConsolesProducts(gameConsolesProducts);
    };

    getProducts();
  }, [
    fetchLatestProducts,
    fetchCategoryDisplayProducts,
  ]);

  // Fetch featured category products when categories are loaded
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      const featuredCategory = newCategories?.categories.find(
        (category) => category.isFeatured
      );
      if (featuredCategory?.name) {
        const products = await fetchCategoryDisplayProducts(featuredCategory.name);
        setFeaturedCategoryProducts(products);
      }
    };

    if (newCategories?.categories?.length > 0) {
      fetchFeaturedProducts();
    }
  }, [newCategories?.categories, fetchCategoryDisplayProducts]);

  useEffect(() => {
    if (prefetched) return;
    const cancel = scheduleIdle(() => {
      void (async () => {
        try {
          setBuyNowPayLaterLoading(true);
          const data = await getBuyNowPayLater();
          setBuyNowPayLater(data);
        } catch (err) {
          console.error("Error fetching Buy Now Pay Later:", err);
          setBuyNowPayLater(null);
        } finally {
          setBuyNowPayLaterLoading(false);
        }
      })();
    });
    return cancel;
  }, [prefetched]);

  useEffect(() => {
    if (prefetched) return;
    const cancel = scheduleIdle(() => {
      void (async () => {
        try {
          setSellBuyCardsLoading(true);
          const data = await getSellBuyCards();
          setSellBuyCards(data);
        } catch (err) {
          console.error("Error fetching Sell/Buy cards:", err);
          setSellBuyCards(null);
        } finally {
          setSellBuyCardsLoading(false);
        }
      })();
    });
    return cancel;
  }, [prefetched]);

  useEffect(() => {
    if (prefetched) return;
    const cancel = scheduleIdle(() => {
      void (async () => {
        try {
          setTinyPhoneBannerLoading(true);
          const data = await getTinyPhoneBanner();
          setTinyPhoneBanner(data);
        } catch (err) {
          console.error("Error fetching Tiny Phone banner:", err);
          setTinyPhoneBanner(null);
        } finally {
          setTinyPhoneBannerLoading(false);
        }
      })();
    });
    return cancel;
  }, [prefetched]);

  useEffect(() => {
    if (prefetched) return;
    const cancel = scheduleIdle(() => {
      void (async () => {
        try {
          setHomepageBlocksLoading(true);
          const data = await getHomepageData();
          if (data && data.blocks && data.blocks.length > 0) {
            setHomepageBlocks(data.blocks);
          }
        } catch (err) {
          console.error("Error fetching homepage data:", err);
          setHomepageBlocks([]);
        } finally {
          setHomepageBlocksLoading(false);
        }
      })();
    });
    return cancel;
  }, [prefetched]);

  useEffect(() => {
    if (prefetched) return;
    const cancel = scheduleIdle(() => {
      void (async () => {
        try {
          const data = await getHomepageNewsletterWidgetPublic();
          setHomeNewsletterWidget(data);
        } catch (err) {
          console.error("Error fetching homepage newsletter widget:", err);
          setHomeNewsletterWidget(null);
        }
      })();
    });
    return cancel;
  }, [prefetched]);

  useEffect(() => {
    if (prefetched) return;
    void (async () => {
      try {
        const v = await getSiteWidgetSettingsPublic();
        setWidgetVisibility(v);
      } catch (err) {
        console.error("Error fetching site widget settings:", err);
      }
    })();
  }, [prefetched]);

  useEffect(() => {
    if (prefetched) return;
    const cancel = scheduleIdle(() => {
      void (async () => {
        try {
          const data = await getTrustpilotSettings();
          if (data) {
            setTrustpilotSettings(data);
          }
        } catch (err) {
          console.error("Error fetching Trustpilot settings:", err);
          setTrustpilotSettings(null);
        }
      })();
    });
    return cancel;
  }, [prefetched]);

  useEffect(() => {
    if (!products.length && !homeBootstrapRef.current.products) {
      homeBootstrapRef.current.products = true;
      dispatch(fetchProducts());
    }
    if (
      !newCategories.categories.length &&
      !homeBootstrapRef.current.categories
    ) {
      homeBootstrapRef.current.categories = true;
      dispatch(fetchProductCategory(category));
    }
    if (
      !categoryCounts.length &&
      !isCountsLoading &&
      !homeBootstrapRef.current.counts
    ) {
      homeBootstrapRef.current.counts = true;
      dispatch(fetchCategoryCounts());
    }
  }, [
    dispatch,
    products.length,
    newCategories.categories.length,
    category,
    categoryCounts.length,
    isCountsLoading,
  ]);

  const featuredCategory = newCategories?.categories.find(
    (category) => category.isFeatured
  );
  const featuredCategoryUrl = featuredCategory
    ? `/categories/${encodeURIComponent(featuredCategory.name)}`
    : "/";

  const samsungCategory = newCategories?.categories?.find(
    (category) => category.name === "Samsung"
  );
  const samsungCategoryUrl = samsungCategory
    ? `/categories/${encodeURIComponent(
        samsungCategory.name.replace(/\s+/g, "-")
      )}`
    : "/";

  const tabletsCategory = newCategories?.categories?.find(
    (category) => category.name === "iPads-and-Tablets"
  );
  const tabletsCategoryUrl = tabletsCategory
    ? `/categories/${encodeURIComponent(tabletsCategory.name)}`
    : "/";

  const laptopsCategory = newCategories?.categories?.find(
    (category) => category.name === "Laptops-and-Macbooks"
  );
  const laptopsCategoryUrl = laptopsCategory
    ? `/categories/${encodeURIComponent(laptopsCategory.name)}`
    : "/";

  const gameConsolesCategory = newCategories?.categories?.find(
    (category) => category.name === "Game-Consoles"
  );
  const gameConsolesCategoryUrl = gameConsolesCategory
    ? `/categories/${encodeURIComponent(gameConsolesCategory.name)}`
    : "/";

  // Fallback to client-side filter if no display products are set
  const samsungPhones = useMemo(
    () =>
      samsungProducts.length > 0
        ? samsungProducts
        : products.filter(
            (product) =>
              product.category.includes("Samsung") &&
              (product.condition === "Brand New" ||
                product.condition === "Refurbished")
          ),
    [products, samsungProducts]
  );

  // Fallback to client-side filter if no display products are set
  const gameConsoles = useMemo(
    () =>
      gameConsolesProducts.length > 0
        ? gameConsolesProducts
        : products.filter((product) => product.category.includes("Game-Consoles")),
    [products, gameConsolesProducts]
  );

  // Dynamic count function using categoryCounts from API
  const countItems = (categoryName: string) => {
    const categoryCount = categoryCounts.find(
      (count) => count.categoryName === categoryName
    );
    return categoryCount ? categoryCount.totalProducts : 0;
  };

  const handleClose = () => {
    setShowThankYou(false);
  };

  useEffect(() => {
    if (mounted) {
      const consent = localStorage.getItem("cookieConsent");
      setShowConsent(!consent || consent === "rejected");
    }
  }, [mounted]);

  useEffect(() => {
    if (prefetched) return;
    let cancelled = false;
    const cancelSchedule = scheduleIdle(() => {
      getCategoryCardsSectionSettings().then((data) => {
        if (!cancelled) setCategoryCardsSection(data);
      });
    });
    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, [prefetched]);

  useEffect(() => {
    if (prefetched) return;
    let cancelled = false;
    const cancelSchedule = scheduleIdle(() => {
      getHomeNavLinksPublic().then((links) => {
        if (!cancelled) setHomeNavLinks(links);
      });
    });
    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, [prefetched]);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <section
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8"
        style={
          categoryCardsSection.sectionBackgroundColor?.trim()
            ? {
                backgroundColor:
                  categoryCardsSection.sectionBackgroundColor.trim(),
              }
            : undefined
        }
      >
        {/* Categories  */}
        <div className="relative">
          <div className="flex items-center gap-3 mt-10">
            <h2
              className="text-2xl font-semibold"
              style={{ color: categoryCardsSection.headingColor }}
            >
              {categoryCardsSection.headingText}
            </h2>
            <div
              className="min-w-0 flex-grow border-b mt-1"
              style={{ borderColor: categoryCardsSection.dividerColor }}
            />
          </div>
        </div>
        <CategoriesCard newCategories={newCategories} countItems={countItems} />
{/* 
        Featured Products
        <SwiperComponent
          title={featuredCategory?.name || "Featured Products"}
          items={featuredCategoryProducts}
          renderCard={(product) => (
            <ProductCardWithStock product={product} checkStockRealTime={true} />
          )}
          link={featuredCategoryUrl}
          linkText="View All"
        /> */}

        {/* When uncommenting promo/Trustpilot blocks below, restore imports:
            next/image (Image), next/link (Link), getPromoImageUrl from promotionalSectionsService,
            DynamicTrustpilotWidget, and rename _buyNowPayLater etc. to drop the leading underscore. */}
        {/* BUY NOW PAY LATER BANNER  */}
        {/* {buyNowPayLaterLoading && (
          <div className="animate-pulse bg-gray-200 rounded-lg min-h-[120px] my-6" />
        )}
        {!buyNowPayLaterLoading && buyNowPayLater && (
          <div
            className={`rounded-lg py-12 px-5 flex justify-between items-center min-h-[120px] my-6 ${
              buyNowPayLater.backgroundImage ? "bg-cover bg-center" : "bg-gradient-to-r from-gray-400 to-gray-200"
            }`}
            style={
              buyNowPayLater.backgroundImage
                ? {
                    backgroundImage: `url(${getPromoImageUrl(buyNowPayLater.backgroundImage)})`,
                  }
                : undefined
            }
          >
            <div>
              <h2 className="text-sm font-bold">
                {buyNowPayLater.heading}
              </h2>
              <p className="text-sm mt-2">{buyNowPayLater.paragraph}</p>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              {(buyNowPayLater.paymentImages || [])
                .map((imgUrl, idx) => ({
                  src: getPromoImageUrl(imgUrl),
                  idx,
                }))
                .filter((x) => x.src.length > 0)
                .map(({ src, idx }) => (
                  <div key={idx} className="relative h-10 w-24">
                    <Image
                      src={src}
                      alt="Payment Option"
                      loading="lazy"
                      fill
                      className="object-contain"
                      sizes="(min-width: 1024px) 96px, 30vw"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        t.style.display = "none";
                      }}
                      unoptimized={src.startsWith("http://localhost")}
                    />
                  </div>
                ))}
            </div>
          </div>
        )} */}

        {/* Latest Products 
        <SwiperComponent
          title="Latest Products"
          items={latestProducts}
          renderCard={(product) => (
            <ProductCardWithStock product={product} checkStockRealTime={true} />
          )}
          link="/shopall"
          linkText="View All"
        /> */}

        {/* buy and sell butons 
        <div className="text-center">
          <h2 className="text-2xl font-semibold my-5">
            Buy Refurbished Mobile Phones & Tablets at the Lowest UK Prices
          </h2>
        </div>

        {sellBuyCardsLoading && (
          <div className="flex flex-col xs:flex-row justify-between gap-4 sum">
            <div className="animate-pulse bg-gray-200 rounded-3xl min-h-[200px] flex-1" />
            <div className="animate-pulse bg-gray-200 rounded-3xl min-h-[200px] flex-1" />
          </div>
        )}
        {!sellBuyCardsLoading && sellBuyCards && (
          <div className="flex flex-col xs:flex-row justify-between gap-4 xl:gap-x-20 sum">
            <div
              className="rounded-3xl w-full p-6 flex flex-wrap items-center md:space-x-20 space-x-5 cursor-pointer transition-transform duration-500 ease-in-out hover:scale-105 hover:shadow-lg bg-cover bg-center min-h-[200px]"
              style={
                sellBuyCards.sellCard.backgroundImage
                  ? {
                      backgroundImage: `url(${getPromoImageUrl(sellBuyCards.sellCard.backgroundImage)})`,
                    }
                  : { backgroundColor: "#FE1054" }
              }
            >
              <div>
                <h2 className="text-white text-[26px] font-bold mb-2">
                  {sellBuyCards.sellCard.heading}
                </h2>
                <p className="text-white mt-4 mb-10">
                  {sellBuyCards.sellCard.paragraph}
                </p>
                {sellBuyCards.sellCard.buttonLink.startsWith("http") ? (
                  <a
                    href={sellBuyCards.sellCard.buttonLink}
                    className="bg-white px-4 py-2 rounded-lg font-semibold text-nowrap"
                  >
                    {sellBuyCards.sellCard.buttonName}
                  </a>
                ) : (
                  <Link
                    href={sellBuyCards.sellCard.buttonLink}
                    className="bg-white px-4 py-2 rounded-lg font-semibold text-nowrap"
                  >
                    {sellBuyCards.sellCard.buttonName}
                  </Link>
                )}
              </div>
              {sellBuyCards.sellCard.productImage && (
                <div className="md:block hidden">
                  <div className="relative md:w-48 w-36 md:h-48 h-36 xl:-mb-6 md:mt-0 sm:mt-20 mt-10">
                    <Image
                      src={getPromoImageUrl(sellBuyCards.sellCard.productImage)}
                      alt={sellBuyCards.sellCard.heading}
                      loading="lazy"
                      fill
                      className="object-contain rounded-md"
                      sizes="(min-width: 1024px) 12rem, 9rem"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        t.style.display = "none";
                      }}
                      unoptimized={getPromoImageUrl(
                        sellBuyCards.sellCard.productImage
                      ).startsWith("http://localhost")}
                    />
                  </div>
                </div>
              )}
            </div>
            <div
              className={`rounded-3xl w-full p-6 flex flex-wrap items-center md:space-x-20 space-x-5 cursor-pointer transition-transform duration-500 ease-in-out hover:scale-105 hover:shadow-lg min-h-[200px] relative ${
                sellBuyCards.buyCard.backgroundImage
                  ? "bg-cover bg-center"
                  : "bg-primary"
              }`}
              style={
                sellBuyCards.buyCard.backgroundImage
                  ? {
                      backgroundImage: `url(${getPromoImageUrl(sellBuyCards.buyCard.backgroundImage)})`,
                    }
                  : undefined
              }
            >
              <div>
                <h2 className="text-white text-[26px] font-bold mb-2">
                  {sellBuyCards.buyCard.heading}
                </h2>
                <p className="text-white mt-4 mb-10">
                  {sellBuyCards.buyCard.paragraph}
                </p>
                {sellBuyCards.buyCard.buttonLink.startsWith("http") ? (
                  <a
                    href={sellBuyCards.buyCard.buttonLink}
                    className="bg-white px-4 py-2 rounded-lg font-semibold text-nowrap"
                  >
                    {sellBuyCards.buyCard.buttonName}
                  </a>
                ) : (
                  <Link
                    href={sellBuyCards.buyCard.buttonLink}
                    className="bg-white px-4 py-2 rounded-lg font-semibold text-nowrap"
                  >
                    {sellBuyCards.buyCard.buttonName}
                  </Link>
                )}
              </div>
              {sellBuyCards.buyCard.productImage && (
                <div className="md:block hidden">
                  <div className="relative md:w-48 w-36 md:h-48 h-36 xl:-mb-6 md:mt-0 sm:mt-20 mt-10">
                    <Image
                      src={getPromoImageUrl(sellBuyCards.buyCard.productImage)}
                      alt={sellBuyCards.buyCard.heading}
                      loading="lazy"
                      fill
                      className="object-contain rounded-md"
                      sizes="(min-width: 1024px) 12rem, 9rem"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        t.style.display = "none";
                      }}
                      unoptimized={getPromoImageUrl(
                        sellBuyCards.buyCard.productImage
                      ).startsWith("http://localhost")}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )} */}
        </section>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-5">
        {/* Samsung new and refurbished */}
        <SwiperComponent
          title="Samsung Galaxy"
          items={samsungPhones}
          renderCard={(product) => (
            <ProductCardWithStock product={product} checkStockRealTime={true} />
          )}
          link={samsungCategoryUrl}
          linkText="View All"
        />

        {/* Ipad and Tablets */}
        <SwiperComponent
          title="iPads & Tablets"
          items={tabletsAndIpadsProducts}
          renderCard={(product) => (
            <ProductCardWithStock product={product} checkStockRealTime={true} />
          )}
          link={tabletsCategoryUrl}
          linkText="View All"
        />

        {/* Game Consoles */}
        <SwiperComponent
          title="Games & Consoles"
          items={gameConsoles}
          renderCard={(product) => (
            <ProductCardWithStock product={product} checkStockRealTime={true} />
          )}
          link={gameConsolesCategoryUrl}
          linkText="View All"
        />

        {/* Laptop & Macbooks */}
        <SwiperComponent
          title="Laptop & Macbooks"
          items={laptopsAndMacbooksProducts}
          renderCard={(product) => (
            <ProductCardWithStock product={product} checkStockRealTime={true} />
          )}
          link={laptopsCategoryUrl}
          linkText="View All"
        />
      </section>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Latest Blogs */}
        {/* <BlogsCard /> */}
        {/* News Letter  */}
        {/* <Newsletter setShowThankYou={setShowThankYou} /> */}

        {/* Dynamic Trustpilot Widget from Admin Settings - After Newsletter */}
        {/* {trustpilotSettings?.homePageScript && (
          <div className="w-full mt-8 mb-4">
            <DynamicTrustpilotWidget
              scriptHtml={trustpilotSettings.homePageScript}
              className="w-full"
            />
          </div>
        )} */}

        <HomepageQuickNav links={homeNavLinks} />

        {widgetVisibility.newsletterEnabled && homeNewsletterWidget ? (
          <NewsletterSignupWidget
            heading={homeNewsletterWidget.heading || undefined}
            description={homeNewsletterWidget.description || undefined}
            placeholder={homeNewsletterWidget.placeholder}
            buttonLabel={homeNewsletterWidget.buttonLabel}
            imageUrl={homeNewsletterWidget.imageUrl || undefined}
            subscribeMode="homepage_widgets"
          />
        ) : null}

        {/* Homepage Content from Admin Panel */}
        {homepageBlocksLoading ? (
          <div>
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        ) : homepageBlocks.length > 0 ? (
          <HomepageContent
            blocks={homepageBlocks}
            widgetVisibility={widgetVisibility}
          />
        ) : null}
      </section>

      {showThankYou && (
        <NewsletterSuccessModal onClose={handleClose} />
      )}
      {showConsent && <CookieConsent />}
    </>
  );
}
