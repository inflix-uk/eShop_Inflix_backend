"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getLogo } from "@/app/services/logoService";
import { Bars3Icon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { ShoppingCartIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/app/context/Auth";
import { fetchNavbarCategory } from "@/app/lib/features/navbarcategories/navbarCategorySlice";
import { isNavbarCustom } from "@/app/lib/features/navbarcategories/navbarTypes";
import type { NavbarItem } from "@/app/lib/features/navbarcategories/navbarTypes";

import NavbarSearch from "@/app/components/navbar/NavbarSearch";
import {
  fetchNavbarHeaderPublic,
  DEFAULT_HEADER_SUPPORT_PHONE,
} from "@/app/services/navbarHeaderPublicService";

import { useAppDispatch, useAppSelector } from "@/app/lib/hooks";
import NavbarCart from "@/app/components/navbar/NavbarCart";
import { RootState as StoreRootState } from "@/app/lib/store";
import Image from "next/image";
import CategoryItem from "./CategoryItem";
import MoreDropdown from "./MoreDropdown";
import CategorySmallMenu from "./CategorySmallMenu";
import { NavbarCustomLinkItem } from "./NavbarCustomLinkItem";

interface NavbarCategorySliceState {
  items: NavbarItem[];
  isLoading: boolean;
  error: string | null;
}

export default function Nav() {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cartItemCount, setCartItemCount] = useState<number>(0);
  const [isSticky, setIsSticky] = useState<boolean>(false);
  const [isSearchBarVisible, setIsSearchBarVisible] = useState<boolean>(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoAlt, setLogoAlt] = useState<string>("Zextons");
  const [logoError, setLogoError] = useState<boolean>(false);
  const [supportPhone, setSupportPhone] = useState<string>(
    DEFAULT_HEADER_SUPPORT_PHONE
  );

  const { items, isLoading } = useAppSelector(
    (state: StoreRootState & { navbarCategory: NavbarCategorySliceState }) =>
      state.navbarCategory
  );

  const sortedNavItems: NavbarItem[] = useMemo(() => {
    if (!items?.length) return [];
    return [...items].sort((a, b) => a.order - b.order);
  }, [items]);

  const visibleNavItems = useMemo(
    () => sortedNavItems.slice(0, 8),
    [sortedNavItems]
  );
  const overflowNavItems = useMemo(
    () => sortedNavItems.slice(8),
    [sortedNavItems]
  );

  useEffect(() => {
    dispatch(fetchNavbarCategory() as never);
  }, [dispatch]);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const logoData = await getLogo();

        if (logoData && logoData.logoUrl) {
          setLogoUrl(logoData.logoUrl);
          setLogoAlt(logoData.altText);
          setLogoError(false);
        } else {
          setLogoError(true);
        }
      } catch {
        setLogoError(true);
      }
    };

    fetchLogo();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchNavbarHeaderPublic().then((data) => {
      if (!cancelled && data.supportPhone) {
        setSupportPhone(data.supportPhone);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const count = cart.reduce(
        (total: number, item: { qty?: number }) => total + (item.qty || 1),
        0
      );
      setCartItemCount(count);
    };

    updateCartCount();

    window.addEventListener("storage", updateCartCount);
    window.addEventListener("cartUpdated", updateCartCount);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth > 768) {
        if (window.scrollY > window.innerHeight * 0.3) {
          setIsSticky(true);
        } else {
          setIsSticky(false);
        }
      } else {
        setIsSticky(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const toggleSearchBar = () => {
    setIsSearchBarVisible(!isSearchBarVisible);
  };
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const determineDestination = useMemo(() => {
    if (!auth.user) return "/login";
    return "/customer/dashboard";
  }, [auth.user]);

  return (
    <>
      <div
        className={`bg-white border-b border-primary py-3 ${
          isSticky ? "fixed top-0 left-0 w-full z-20" : ""
        }`}
      >
        <div className="mx-auto max-w-7xl lg:px-8 ">
          <nav className="px-4 py-0">
            <div className="max-w-screen-xl mx-auto flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex min-w-0 items-center lg:flex-1 lg:items-center">
                  <button
                    className="lg:hidden block p-2 text-gray-700"
                    onClick={toggleDrawer}
                    aria-controls="drawer-navigation"
                    aria-expanded={isDrawerOpen ? "true" : "false"}
                    aria-label="Toggle navigation drawer"
                  >
                    <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                  </button>
                  <Link
                    href="/"
                    className="relative block h-11 w-40 shrink-0 md:ps-0"
                  >
                    {logoUrl && !logoError && (
                      <Image
                        src={logoUrl}
                        alt={logoAlt}
                        fill
                        className="object-contain object-left"
                        sizes="160px"
                        priority
                        onError={() => {
                          setLogoError(true);
                          setLogoUrl(null);
                        }}
                        unoptimized={logoUrl.startsWith("http://localhost")}
                      />
                    )}
                  </Link>
                </div>
              </div>
              <div className="flex-grow hidden lg:flex items-center md:mx-20">
                <NavbarSearch />
              </div>
              <div className="lg:flex hidden items-center space-x-2">
                <div className="md:flex hidden flex-col">
                  <span className="text-gray-700 text-xs">Need Help?</span>
                  <a
                    href={`tel:${supportPhone.replace(/[^\d+]/g, "")}`}
                    className="text-gray-700 font-bold hover:text-gray-900 hover:underline focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                  >
                    {supportPhone}
                  </a>
                </div>
                <Link href={determineDestination} aria-label="Go to profile">
                  <div className="flex items-center space-x-2 cursor-pointer">
                    <svg
                      className="lg:h-9 h-6 lg:w-9 w-6"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <g fill="none" stroke="#000" strokeWidth="2">
                        <circle cx="12" cy="7" r="5" />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 14h.352a3 3 0 0 1 2.976 2.628l.391 3.124A2 2 0 0 1 18.734 22H5.266a2 2 0 0 1-1.985-2.248l.39-3.124A3 3 0 0 1 6.649 14H7"
                        />
                      </g>
                    </svg>
                  </div>
                </Link>
                <div className="flex items-center space-x-2 cursor-pointer">
                  <button
                    onClick={toggleCart}
                    className="group -m-2 flex items-center p-2"
                    aria-label="Open basket"
                  >
                    <div className="md:flex hidden flex-col">
                      <span className="text-gray-700 text-xs">Basket</span>
                      <span className="text-gray-700 font-bold">£0.00</span>
                    </div>
                    <ShoppingCartIcon
                      className="lg:h-10 h-6 lg:w-10 w-6 flex-shrink-0 text-black-400 group-hover:text-black ms-1"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-800">
                      {cartItemCount}
                    </span>
                  </button>
                </div>
              </div>
              <div className="flex flex-col lg:hidden">
                <div className="flex items-center lg:hidden">
                  <button
                    onClick={toggleSearchBar}
                    className="text-white focus:outline-none mr-4"
                    aria-label="Toggle search bar"
                  >
                    <MagnifyingGlassIcon
                      className="text-gray-900 size-6"
                      aria-hidden="true"
                      fontWeight={"bold"}
                    />
                  </button>
                  <button
                    className="text-white focus:outline-none mr-4"
                    aria-label="Open profile"
                  >
                    <Link
                      href={determineDestination}
                      aria-label="Go to profile"
                    >
                      <svg
                        style={{ height: "50px", width: "25px" }}
                        xmlns="http://www.w3.org/2000/svg"
                        width="1em"
                        height="1em"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <g fill="none" stroke="#000" strokeWidth="2">
                          <circle cx="12" cy="7" r="5" />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17 14h.352a3 3 0 0 1 2.976 2.628l.391 3.124A2 2 0 0 1 18.734 22H5.266a2 2 0 0 1-1.985-2.248l.39-3.124A3 3 0 0 1 6.649 14H7"
                          />
                        </g>
                      </svg>
                    </Link>
                  </button>

                  <button
                    onClick={() => setIsCartOpen(true)}
                    className="group -m-2 flex items-center p-2"
                  >
                    <ShoppingCartIcon
                      className="h-6 w-6 flex-shrink-0 text-black-400 group-hover:text-black"
                      aria-hidden="true"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-gray-800">
                      {cartItemCount}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            {isSearchBarVisible && (
              <div className="flex lg:hidden items-center justify-center mb-3">
                <NavbarSearch />
              </div>
            )}
          </nav>
        </div>
      </div>

      {isLoading && sortedNavItems.length === 0 && (
        <div className="bg-primary text-white py-3 md:px-5 lg:flex hidden">
          <ul className="flex flex-wrap justify-between space-x-4 px-1 mx-auto max-w-7xl">
            <li>Loading...</li>
          </ul>
        </div>
      )}
      {!isLoading && sortedNavItems.length > 0 && (
        <div className="bg-primary text-white py-3 md:px-5 lg:flex hidden">
          <ul className="flex flex-wrap justify-between space-x-4 px-1 mx-auto max-w-7xl">
            {visibleNavItems.map((item, i) => {
              if (isNavbarCustom(item)) {
                return (
                  <NavbarCustomLinkItem
                    key={item._id}
                    link={{ label: item.label, path: item.path }}
                    index={i}
                  />
                );
              }
              return (
                <CategoryItem
                  key={item._id}
                  category={{
                    _id: item._id,
                    name: item.name,
                    subCategory: item.subCategory,
                  }}
                />
              );
            })}
            {overflowNavItems.length > 0 && (
              <MoreDropdown items={overflowNavItems} />
            )}
          </ul>
        </div>
      )}
      <CategorySmallMenu
        isOpen={isDrawerOpen}
        toggleDrawer={toggleDrawer}
        navItems={sortedNavItems}
      />
      <NavbarCart
        openCart={isCartOpen}
        setOpenCart={setIsCartOpen}
        setCartItemCount={setCartItemCount}
      />
    </>
  );
}
