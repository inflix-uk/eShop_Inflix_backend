import axios from 'axios';
import type { NavbarItem } from '@/app/lib/features/navbarcategories/navbarTypes';
import { isNavbarCustom } from '@/app/lib/features/navbarcategories/navbarTypes';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';

/** @deprecated Use NavbarItem from navbarTypes */
export type NavbarCategory = Extract<NavbarItem, { name: string }> & {
  createdAt?: string;
};

export async function getLatestProducts() {
  try {
    const response = await axios.get(`${BASE_URL}/api/products/latest`);
    return response.data.products || [];
  } catch (error) {
    console.error('Error fetching latest products:', error);
    return [];
  }
}

export async function getRefurbishedProducts() {
  try {
    const response = await axios.get(`${BASE_URL}/api/products/refurbished`);
    return response.data.products || [];
  } catch (error) {
    console.error('Error fetching refurbished products:', error);
    return [];
  }
}

export async function getFeaturedCategoryProducts() {
  try {
    const response = await axios.get(`${BASE_URL}/api/products/homepage`);
    return response.data.products || [];
  } catch (error) {
    console.error('Error fetching featured category products:', error);
    return [];
  }
}

export async function getNavbarCategories(): Promise<NavbarItem[]> {
  try {
    const response = await axios.get(`${BASE_URL}/api/navbar`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rows: NavbarItem[] = response.data?.data || [];
    
    return rows
      .filter((row) => isNavbarCustom(row) || row.isPublish)
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Failed to fetch navbar categories:', error);
    return [];
  }
}

export async function getInitialHomeData() {
  try {
    const [latestProducts, refurbishedProducts, featuredProducts, categories] = await Promise.all([
      getLatestProducts(),
      getRefurbishedProducts(), 
      getFeaturedCategoryProducts(),
      getNavbarCategories()
    ]);

    return {
      latestProducts,
      refurbishedProducts,
      featuredProducts,
      categories
    };
  } catch (error) {
    console.error('Error fetching initial home data:', error);
    return {
      latestProducts: [],
      refurbishedProducts: [],
      featuredProducts: [],
      categories: []
    };
  }
}