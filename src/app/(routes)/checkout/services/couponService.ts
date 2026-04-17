import { Coupon, ProductItem } from '../../../../../types';
import { toast } from 'react-toastify';
import { api } from '../api';

export interface CouponValidationResult {
  isValid: boolean;
  error: string;
  coupon?: Coupon;
}

export class CouponService {
  static init(): CouponService {
    return new CouponService();
  }

  async getAllCoupons(): Promise<Coupon[] | null> {
    try {
      const response = await api.getAllCoupons();

      if (response.status === 201) {
        return response.coupon;
      } else {
        console.log('Failed to load coupons');
        return null;
      }
    } catch (error) {
      console.error('Error loading coupons:', error);
      return null;
    }
  }

  validateCouponCode(enteredCode: string, availableCoupons: Coupon[]): boolean {
    return availableCoupons.some(
      coupon => coupon.code.toLowerCase() === enteredCode.toLowerCase()
    );
  }

  validateCouponApplication(
    enteredCode: string,
    availableCoupons: Coupon[],
    cartTotal: number,
    userId?: string
  ): CouponValidationResult {
    const coupon = availableCoupons.find(
      c => c.code.toLowerCase() === enteredCode.toLowerCase()
    );

    if (!coupon) {
      return { isValid: false, error: 'Invalid coupon code' };
    }

    // Check if coupon is expired
    const currentDate = new Date();
    const expiryDate = new Date((coupon as any).expiryDate);

    if (expiryDate < currentDate) {
      return { isValid: false, error: 'This coupon has expired.' };
    }

    // Check minimum order value
    if ((coupon as any).minOrderValue > 0 && cartTotal < (coupon as any).minOrderValue) {
      return {
        isValid: false,
        error: `This coupon requires a minimum order of £${(coupon as any).minOrderValue}.`
      };
    }

    // Check if user has already used this coupon (if user is logged in)
    if (userId && !(coupon as any).allowMultiple && (coupon as any).usageHistory?.length > 0) {
      const hasUserUsedCoupon = (coupon as any).usageHistory.some(
        (usage: { userId: string }) => usage.userId === userId
      );

      if (hasUserUsedCoupon) {
        return { isValid: false, error: 'You have already used this coupon.' };
      }
    }

    return { isValid: true, error: '', coupon };
  }

  calculateTotalSalePrice(products: ProductItem[], coupon: Coupon | null = null): number {
    let total = products
      .reduce((sum, product) => {
        return sum + parseFloat((product.salePrice * product.qty).toFixed(2));
      }, 0);

    if (coupon) {
      total = this.applyCouponDiscount(total, coupon);
    }

    return Math.max(0, parseFloat(total.toFixed(2)));
  }

  private applyCouponDiscount(total: number, coupon: Coupon): number {
    if (coupon.discount_type === 'flat') {
      return total - coupon.discount;
    } else if (coupon.discount_type === 'percentage') {
      const discountAmount = (total * coupon.discount) / 100;
      return total - (coupon.upto ? Math.min(discountAmount, coupon.upto) : discountAmount);
    }
    return total;
  }

  getCartTotal(): number {
    try {
      const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
      return this.calculateTotalSalePrice(cartData);
    } catch {
      return 0;
    }
  }

  storeAppliedCoupon(coupon: Coupon): void {
    localStorage.removeItem('appliedcoupon');
    localStorage.setItem('appliedcoupon', JSON.stringify(coupon));
  }

  getStoredCoupon(): Coupon | null {
    try {
      const storedCoupon = localStorage.getItem('appliedcoupon');
      return storedCoupon ? JSON.parse(storedCoupon) : null;
    } catch {
      return null;
    }
  }

  removeStoredCoupon(): void {
    localStorage.removeItem('appliedcoupon');
  }

  validateStoredCoupon(): boolean {
    const storedCoupon = this.getStoredCoupon();
    if (!storedCoupon) return true;

    try {
      // Check if coupon is expired
      const currentDate = new Date();
      const expiryDate = new Date((storedCoupon as any).expiryDate);

      if (expiryDate < currentDate) {
        this.removeStoredCoupon();
        toast.error('Coupon removed: it has expired.');
        return false;
      }

      // Check minimum order value
      const currentTotal = this.getCartTotal();
      if ((storedCoupon as any).minOrderValue > 0 && currentTotal < (storedCoupon as any).minOrderValue) {
        this.removeStoredCoupon();
        toast.error(`Coupon removed: minimum order of £${(storedCoupon as any).minOrderValue} not met.`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating stored coupon:', error);
      this.removeStoredCoupon();
      return false;
    }
  }
}