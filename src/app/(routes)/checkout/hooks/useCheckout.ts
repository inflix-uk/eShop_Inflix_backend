import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/app/context/Auth';
import { useAppDispatch, useAppSelector } from '@/app/lib/hooks';
import { setUser } from '@/app/lib/features/userslice/userSlice';
import { setPaymentDetails } from '@/app/lib/features/paymentdetails/paymentDetailsSlice';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

import { AuthService } from '../services/authService';
import { OrderService } from '../services/orderService';
import { PaymentService } from '../services/paymentService';
import { CouponService } from '../services/couponService';
import { ValidationService } from '../services/validationService';
import { api, getActiveShippingMethods, ShippingMethod } from '../api';

import {
  ShippingInformation,
  ContactInfo,
  Errors,
  ProductItem,
  Coupon,
} from '../../../../../types';

export const useCheckout = () => {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const userState = useAppSelector((state: any) => state.user);
  const paymentDetails = useAppSelector((state: any) => state.payment);

  // Initialize services with memoization
  const authService = useMemo(() => AuthService.init(), []);
  const orderService = useMemo(() => OrderService.init(), []);
  const paymentService = useMemo(() => PaymentService.init(), []);
  const couponService = useMemo(() => CouponService.init(), []);

  // State
  const [progress, setProgress] = useState<number>(0);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [errors, setErrors] = useState<Errors>(ValidationService.getCleanErrors());
  const [shippingInformation, setShippingInformation] = useState<ShippingInformation>({
    firstName: auth?.user?.firstname || '',
    lastName: auth?.user?.lastname || '',
    companyName: auth?.user?.companyname || '',
    address: auth?.user?.address?.address || '',
    apartment: auth?.user?.address?.apartment || '',
    country: auth?.user?.address?.country || 'United Kingdom',
    city: auth?.user?.address?.city || '',
    county: auth?.user?.address?.county || '',
    postalCode: auth?.user?.address?.postalCode || '',
    phoneNumber: auth?.user?.phoneNumber || '',
  });

  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: auth?.user?.email || '',
    userId: auth?.user?._id || '',
  });

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [enteredCoupon, setEnteredCoupon] = useState<string>('');
  const [isCouponValid, setIsCouponValid] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string>('');
  const [totalSalePrice, setTotalSalePrice] = useState<number>(0);
  const [discountedPrice, setDiscountedPrice] = useState<number>(0);

  // Shipping state
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<ShippingMethod | null>(null);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(null);
  const [freeShippingEnabled, setFreeShippingEnabled] = useState<boolean>(false);
  const [shippingCost, setShippingCost] = useState<number>(0);

  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentDetailsFetched, setPaymentDetailsFetched] = useState<boolean>(false);

  // Embedded payment state
  const [isPaymentReady, setIsPaymentReady] = useState<boolean>(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [currentOrderNumber, setCurrentOrderNumber] = useState<string | null>(null);

  // Auth form states
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string>('');

  // Initialize Stripe on page load
  useEffect(() => {
    const initStripe = async () => {
      const stripe = await paymentService.initializeStripe();
      setStripePromise(stripe);
    };
    initStripe();
  }, [paymentService]);

  // Fetch shipping methods on page load
  useEffect(() => {
    const fetchShippingMethods = async () => {
      try {
        const response = await getActiveShippingMethods();
        if (response.success && response.data.methods.length > 0) {
          setShippingMethods(response.data.methods);
          setFreeShippingThreshold(response.data.freeShippingThreshold);
          setFreeShippingEnabled(response.data.freeShippingEnabled);
          // Select the first shipping method by default
          setSelectedShippingMethod(response.data.methods[0]);
        }
      } catch (error) {
        console.error('Error fetching shipping methods:', error);
      }
    };
    fetchShippingMethods();
  }, []);

  // Calculate shipping cost based on selected method and cart total
  useEffect(() => {
    if (!selectedShippingMethod) {
      setShippingCost(0);
      return;
    }

    // Free shipping only applies to the cheapest method (order: 0)
    const isCheapestMethod = selectedShippingMethod.order === 0;
    const qualifiesForFreeShipping = freeShippingEnabled &&
      freeShippingThreshold !== null &&
      totalSalePrice >= freeShippingThreshold;

    if (qualifiesForFreeShipping && isCheapestMethod) {
      setShippingCost(0);
    } else {
      setShippingCost(selectedShippingMethod.price);
    }
  }, [selectedShippingMethod, totalSalePrice, freeShippingEnabled, freeShippingThreshold]);

  // Handle shipping method selection
  const handleShippingMethodChange = useCallback((method: ShippingMethod) => {
    setSelectedShippingMethod(method);
  }, []);

  // Update PaymentIntent amount when shipping method changes
  // This ensures Stripe shows the correct total including shipping
  const shippingUpdateRef = useRef<boolean>(false);
  useEffect(() => {
    // Skip on initial render - only update when shipping actually changes
    if (!shippingUpdateRef.current) {
      shippingUpdateRef.current = true;
      return;
    }

    const updatePaymentAmount = async () => {
      // Only update if we have a valid PaymentIntent
      const storedPaymentIntentId = paymentIntentId || localStorage.getItem('paymentIntentId');
      if (!storedPaymentIntentId) {
        console.log('⏭️ No PaymentIntent yet, skipping shipping amount update');
        return;
      }

      // Get cart and coupon data
      const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
      if (cartData.length === 0) {
        console.log('⏭️ Empty cart, skipping shipping amount update');
        return;
      }

      const storedCoupon = JSON.parse(localStorage.getItem('appliedcoupon') || 'null');

      // Build shipping method data
      const shippingMethodData = selectedShippingMethod ? {
        name: selectedShippingMethod.name,
        price: shippingCost,
        estimatedDays: selectedShippingMethod.estimatedDays,
        methodId: selectedShippingMethod._id,
      } : null;

      try {
        console.log('📦 Updating PaymentIntent amount with shipping:', shippingCost);
        const response = await api.updatePaymentIntentAmount({
          paymentIntentId: storedPaymentIntentId,
          cartproducts: cartData,
          coupondata: storedCoupon,
          shippingMethod: shippingMethodData,
        });

        if (response.success) {
          console.log('✅ PaymentIntent amount updated:', response.amount / 100, 'GBP');
          // Update client secret if it changed (for Elements re-render)
          if (response.clientSecret && response.clientSecret !== clientSecret) {
            setClientSecret(response.clientSecret);
            localStorage.setItem('clientSecret', response.clientSecret);
          }
        }
      } catch (error) {
        console.error('❌ Failed to update PaymentIntent amount:', error);
        // Don't set error state - shipping selection should still work
        // The final amount will be calculated on order creation
      }
    };

    updatePaymentAmount();
  }, [shippingCost, selectedShippingMethod, paymentIntentId, clientSecret]);

  // Create PaymentIntent when cart data is available - only runs ONCE per page load
  // Use localStorage as the primary lock since useRef resets on Strict Mode remount
  useEffect(() => {
    let isMounted = true;

    const createInitialPaymentIntent = async () => {
      // Generate a unique session ID for this page load
      const sessionId = sessionStorage.getItem('checkoutSessionId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!sessionStorage.getItem('checkoutSessionId')) {
        sessionStorage.setItem('checkoutSessionId', sessionId);
      }

      // Check if we already have a valid clientSecret from CURRENT session
      const existingClientSecret = localStorage.getItem('clientSecret');
      const existingPaymentIntentId = localStorage.getItem('paymentIntentId');
      const creationLock = localStorage.getItem('paymentIntentCreating');
      const createdTimestamp = localStorage.getItem('paymentIntentCreatedAt');
      const createdSessionId = localStorage.getItem('paymentIntentSessionId');

      // If creation is in progress (lock exists and is recent), wait and check again
      if (creationLock) {
        const lockTime = parseInt(creationLock, 10);
        if (Date.now() - lockTime < 30000) { // 30 second lock
          console.log('⏳ PaymentIntent creation in progress, waiting...');
          // Wait a bit then check if clientSecret was set
          await new Promise(resolve => setTimeout(resolve, 2000));
          const newClientSecret = localStorage.getItem('clientSecret');
          const newPaymentIntentId = localStorage.getItem('paymentIntentId');
          if (newClientSecret && newPaymentIntentId && isMounted) {
            console.log('✅ Using PaymentIntent from concurrent creation:', newPaymentIntentId);
            setClientSecret(newClientSecret);
            setPaymentIntentId(newPaymentIntentId);
            setIsPaymentReady(true);
          }
          return;
        } else {
          // Lock is stale, clear it
          localStorage.removeItem('paymentIntentCreating');
        }
      }

      // Reuse PaymentIntent if:
      // 1. It exists and is valid
      // 2. It was created within the last 5 minutes (to handle page refreshes)
      // 3. It's from the same session (to prevent Strict Mode duplicates)
      const isRecentlyCreated = createdTimestamp && (Date.now() - parseInt(createdTimestamp, 10) < 300000); // 5 minutes
      const isSameSession = createdSessionId === sessionId;

      if (existingClientSecret && existingClientSecret.includes('_secret_') && existingPaymentIntentId && isRecentlyCreated) {
        console.log('✅ Using existing PaymentIntent:', existingPaymentIntentId, isSameSession ? '(same session)' : '(previous session)');
        if (isMounted) {
          setClientSecret(existingClientSecret);
          setPaymentIntentId(existingPaymentIntentId);
          setIsPaymentReady(true);
        }
        return;
      }

      // Clear old PaymentIntent data if it exists (it's stale)
      if (existingClientSecret || existingPaymentIntentId) {
        console.log('🧹 Clearing stale PaymentIntent data...');
        localStorage.removeItem('clientSecret');
        localStorage.removeItem('paymentIntentId');
        localStorage.removeItem('paymentIntentCreatedAt');
        localStorage.removeItem('paymentIntentSessionId');
      }

      // Get cart data
      const cartData = JSON.parse(localStorage.getItem('cart') || '[]');

      if (cartData.length === 0) {
        console.log('No products in cart, skipping PaymentIntent creation');
        return;
      }

      // SET LOCK IMMEDIATELY before any async operation
      console.log('🔒 Setting PaymentIntent creation lock...');
      localStorage.setItem('paymentIntentCreating', Date.now().toString());

      // Get stored coupon
      const storedCoupon = JSON.parse(localStorage.getItem('appliedcoupon') || 'null');

      // Get user info if available
      const userForOrder = JSON.parse(localStorage.getItem('userForOrder') || '{}');
      const userEmail = auth?.user?.email || userForOrder?.email || '';
      const userId = auth?.user?._id || userForOrder?._id || '';

      // Create PaymentIntent for embedded payment form
      // Mark as express checkout so backend doesn't set shipping (allows Apple Pay/Google Pay to work)
      try {
        console.log('💳 Creating initial PaymentIntent for embedded form...');
        const paymentIntentData = await api.createPaymentIntent({
          cartproducts: cartData,
          coupondata: storedCoupon,
          shippingInformation: {
            firstName: 'Pending',
            lastName: 'Customer',
            companyName: '',
            address: 'To be provided',
            apartment: '',
            country: 'United Kingdom',
            city: 'London',
            county: '',
            postalCode: 'SW1A 1AA',
            phoneNumber: '00000000000',
          },
          contactInformation: {
            email: userEmail || 'pending@checkout.local',
            userId: userId || 'pending'
          },
          orderNumber: '',
          isExpressCheckout: true, // Don't set shipping on PaymentIntent - allows Apple Pay/Google Pay to work
        });

        // Validate the response
        if (!paymentIntentData || !paymentIntentData.clientSecret) {
          throw new Error('Invalid payment response - missing client secret');
        }

        // Validate clientSecret format (should contain _secret_)
        if (!paymentIntentData.clientSecret.includes('_secret_')) {
          throw new Error('Invalid client secret format received');
        }

        console.log('✅ Initial PaymentIntent created:', paymentIntentData.paymentIntentId);
        console.log('💰 Amount:', paymentIntentData.amount, 'pence');

        // Store in localStorage FIRST (so other renders can pick it up)
        localStorage.setItem('clientSecret', paymentIntentData.clientSecret);
        localStorage.setItem('paymentIntentId', paymentIntentData.paymentIntentId);
        localStorage.setItem('paymentIntentCreatedAt', Date.now().toString());
        localStorage.setItem('paymentIntentSessionId', sessionId);
        localStorage.removeItem('paymentIntentCreating'); // Release lock

        // Set state only if component is still mounted
        if (isMounted) {
          setClientSecret(paymentIntentData.clientSecret);
          setPaymentIntentId(paymentIntentData.paymentIntentId);
          setIsPaymentReady(true);
        }
      } catch (error: any) {
        console.error('Failed to create initial PaymentIntent:', error);
        localStorage.removeItem('paymentIntentCreating'); // Release lock on error
        if (isMounted) {
          setPaymentError(error.message || 'Failed to initialize payment. Please refresh the page.');
        }
      }
    };

    createInitialPaymentIntent();

    // Cleanup function
    return () => {
      isMounted = false;
    };
    // Only run on mount - empty dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load coupons
  useEffect(() => {
    const loadCoupons = async () => {
      setProgress(50);
      const couponsData = await couponService.getAllCoupons();
      if (couponsData) {
        setCoupons(couponsData);
      }
      setProgress(100);
    };
    loadCoupons();
  }, [couponService]);

  // Load cart and validate stored coupon
  useEffect(() => {
    const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
    setProducts(cartData);

    // Calculate initial prices
    const total = couponService.calculateTotalSalePrice(cartData);
    setTotalSalePrice(total);

    // Validate and restore stored coupon
    if (couponService.validateStoredCoupon()) {
      const storedCoupon = couponService.getStoredCoupon();
      if (storedCoupon) {
        setAppliedCoupon(storedCoupon);
        const discounted = couponService.calculateTotalSalePrice(cartData, storedCoupon);
        setDiscountedPrice(discounted);
      } else {
        setDiscountedPrice(total);
      }
    } else {
      setDiscountedPrice(total);
    }
  }, [couponService]);

  // Update shipping information when user logs in
  useEffect(() => {
    if (auth?.user) {
      setShippingInformation({
        firstName: auth.user.firstname || '',
        lastName: auth.user.lastname || '',
        companyName: auth.user.companyname || '',
        address: auth.user.address?.address || '',
        apartment: auth.user.address?.apartment || '',
        country: auth.user.address?.country || 'United Kingdom',
        city: auth.user.address?.city || '',
        county: auth.user.address?.county || '',
        postalCode: auth.user.address?.postalCode || '',
        phoneNumber: auth.user.phoneNumber || '',
      });
      setContactInfo({
        email: auth.user.email,
        userId: auth.user._id,
      });
      setEmail(auth.user.email);
    }
  }, [auth.user]);

  // Recalculate prices when products or coupon changes
  useEffect(() => {
    const total = couponService.calculateTotalSalePrice(products);
    setTotalSalePrice(total);

    const discounted = couponService.calculateTotalSalePrice(products, appliedCoupon);
    setDiscountedPrice(discounted);
  }, [products, appliedCoupon, couponService]);

  // Handle payment success from URL
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      const { isSuccess, sessionId } = paymentService.getPaymentSuccessFromURL();

      if (isSuccess && sessionId) {
        if (!paymentDetails.paymentIntentId) {
          const paymentData = await paymentService.retrievePaymentDetails(sessionId);
          if (paymentData) {
            dispatch(setPaymentDetails({
              paymentIntentId: paymentData.paymentIntentId,
              paymentMethodId: paymentData.paymentMethodId ?? null,
              cardDetails: paymentData.cardDetails || { cardNumber: '', expiryDate: '', cvv: '' }
            }));
            setPaymentDetailsFetched(true);
          }
        } else {
          setPaymentDetailsFetched(true);
        }
      }
    };

    handlePaymentSuccess();
  }, [paymentDetails, paymentService, dispatch]);

  const handleLogin = async () => {
    setProgress(50);
    try {
      const validationErrors = ValidationService.validateLoginForm(email, password);
      if (ValidationService.hasValidationErrors(validationErrors)) {
        const cleanErrors = ValidationService.getCleanErrors();
        setErrors({
          ...cleanErrors,
          email: validationErrors.email || cleanErrors.email,
          password: validationErrors.password || cleanErrors.password
        });
        setProgress(100);
        return false;
      }

      setErrors(ValidationService.getCleanErrors());

      const response = await authService.login(email, password);
      if (response && response.status === 201) {
        dispatch(setUser({
          email: response.user.email,
          userId: response.user._id,
        }));

        setContactInfo({
          email: response.user.email,
          userId: response.user._id,
        });

        auth.login(response.user);
        setProgress(100);
        return response.user;
      } else if (response && response.message) {
        // Handle API error (e.g., "Invalid password", "User not found")
        const errorMessage = response.message.toLowerCase();
        if (errorMessage.includes('password')) {
          setErrors(prev => ({
            ...prev,
            password: response.message || 'Invalid password'
          }));
        } else {
          setErrors(prev => ({
            ...prev,
            email: response.message || 'Login failed'
          }));
        }
        setProgress(100);
        return false;
      } else {
        setProgress(100);
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      setProgress(100);
      return false;
    }
  };

  const handleRegister = async () => {
    setProgress(50);
    try {
      const validationErrors = ValidationService.validateRegistrationForm(
        email,
        password,
        confirmPassword,
        shippingInformation
      );

      if (ValidationService.hasValidationErrors(validationErrors)) {
        setErrors(validationErrors);
        setProgress(100);
        return false;
      }

      setErrors(ValidationService.getCleanErrors());

      const response = await authService.register(email, password, confirmPassword, shippingInformation);
      if (response && response.status === 201) {
        setProgress(100);
        return true;
      } else if (response && response.message) {
        // Handle API error (e.g., "Email already exists", "Phone number already exists")
        const errorMessage = response.message.toLowerCase();
        if (errorMessage.includes('phone')) {
          setErrors(prev => ({
            ...prev,
            phoneNumber: response.message
          }));
        } else {
          setErrors(prev => ({
            ...prev,
            email: response.message
          }));
        }
        setProgress(100);
        return false;
      } else {
        setProgress(100);
        return false;
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setProgress(100);
      return false;
    }
  };

  const handleCouponInputChange = (code: string) => {
    setEnteredCoupon(code);
    setCouponError('');

    const isValid = couponService.validateCouponCode(code, coupons);
    setIsCouponValid(isValid);

    if (code && !isValid) {
      setCouponError('Invalid coupon code');
    }
  };

  const handleApplyCoupon = () => {
    setCouponError('');

    if (isCouponValid) {
      const cartTotal = couponService.getCartTotal();
      const validation = couponService.validateCouponApplication(
        enteredCoupon,
        coupons,
        cartTotal,
        auth?.user?._id
      );

      if (!validation.isValid) {
        setCouponError(validation.error);
        return;
      }

      if (validation.coupon) {
        setAppliedCoupon(validation.coupon);
        couponService.storeAppliedCoupon(validation.coupon);
      }
    }
  };

  const handleShippingChange = (name: string, value: string) => {
    setShippingInformation(prev => ({
      ...prev,
      [name]: value,
    }));
    setErrors(prev => ({
      ...prev,
      [name]: '',
    }));
  };

  const handleTermsCheckboxChange = (checked: boolean) => {
    setIsChecked(checked);
    setShowWarning(false);
  };

  const removeFromCart = (productId: string) => {
    const updatedCart = products.filter(product => product._id !== productId);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    setProducts(updatedCart);
  };

  const handlePlaceOrder = async () => {
    setProgress(50);
    setIsProcessingPayment(true);
    setPaymentError('');

    try {
      // Clear previous errors
      setGeneralError('');

      // Validate terms
      const termsError = ValidationService.validateTermsAccepted(isChecked);
      if (termsError) {
        setShowWarning(true);
        setGeneralError(termsError);
        setProgress(100);
        setIsProcessingPayment(false);
        return;
      }

      // Validate cart
      const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
      if (!ValidationService.validateCartData(cartData)) {
        setGeneralError('Your cart is empty');
        setProgress(100);
        setIsProcessingPayment(false);
        return;
      }

      // Validate form
      const validationErrors = ValidationService.validateShippingInformation(shippingInformation);
      if (ValidationService.hasValidationErrors(validationErrors)) {
        const cleanErrors = ValidationService.getCleanErrors();
        setErrors({
          ...cleanErrors,
          firstName: validationErrors.firstName || cleanErrors.firstName,
          lastName: validationErrors.lastName || cleanErrors.lastName,
          phoneNumber: validationErrors.phoneNumber || cleanErrors.phoneNumber,
          address: validationErrors.address || cleanErrors.address,
          postalCode: validationErrors.postalCode || cleanErrors.postalCode
        });
        setProgress(100);
        setIsProcessingPayment(false);
        return;
      }

      // Validate contact information
      const validContactInfo = orderService.validateContactInformation(
        userState,
        contactInfo,
        contactInfo
      );

      if (!validContactInfo) {
        throw new Error('Invalid contact information');
      }

      // Create order with "Failed" status first
      const orderData = {
        cart: cartData,
        shippingInformation,
        contactInformation: validContactInfo,
        coupon: appliedCoupon,
        orderNumber: orderService.getStoredOrderNumber(),
        status: 'Failed',
        shippingMethod: selectedShippingMethod ? {
          name: selectedShippingMethod.name,
          price: shippingCost,
          estimatedDays: selectedShippingMethod.estimatedDays,
          methodId: selectedShippingMethod._id,
        } : null,
      };

      const orderResponse = await orderService.createOrder(orderData);
      console.log('📦 Order created response:', orderResponse);

      if (orderResponse) {
        console.log('✅ Order response received. Order number:', orderResponse.orderNumber);

        // Validate order number exists
        if (!orderResponse.orderNumber) {
          console.error('❌ Order number is missing from response!', orderResponse);
          setGeneralError('Order created but order number is missing. Please contact support.');
          setProgress(100);
          setIsProcessingPayment(false);
          return;
        }

        // Store order number
        const orderNum = orderResponse.orderNumber;
        setCurrentOrderNumber(orderNum);
        orderService.storeOrderNumber(orderNum);
        console.log('💾 Order number stored:', orderNum);

        // Store shipping information for retrieval after payment
        localStorage.setItem('shippingInformation', JSON.stringify(shippingInformation));
        localStorage.setItem('cart-old', JSON.stringify(cartData));

        // Store user for order
        orderService.storeUserForOrder({
          email: validContactInfo.email,
          _id: validContactInfo.userId,
        });

        // NOTE: In embedded payment flow, PaymentIntent was already created on page load
        // Do NOT create a new PaymentIntent here as it would invalidate the Elements clientSecret
        // The payment form is already visible and ready to use
        console.log('✅ Order created. Using existing PaymentIntent for embedded checkout.');

        setProgress(100);
        setIsProcessingPayment(false);
      } else {
        setGeneralError('Failed to create order. Please try again.');
        setProgress(100);
        setIsProcessingPayment(false);
      }
    } catch (error: any) {
      console.error('Order creation failed:', error);
      setGeneralError(error.message || 'Failed to create order. Please try again.');
      setProgress(100);
      setIsProcessingPayment(false);
    }
  };

  // Handle successful payment from embedded form
  // Note: The webhook will handle updating the order status to "Pending"
  // This function just handles cleanup and redirect
  const handlePaymentSuccess = useCallback(async (paymentIntentResult: any) => {
    setProgress(50);
    setIsProcessingPayment(true);

    try {
      let orderNum = currentOrderNumber || orderService.getStoredOrderNumber();

      // Get cart data for thank-you page
      const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
      const appliedCouponData = JSON.parse(localStorage.getItem('appliedcoupon') || 'null');
      let shippingInfo = JSON.parse(localStorage.getItem('shippingInformation') || 'null');

      // Check if this is an Express Checkout (Apple Pay / Google Pay)
      // If so, we need to create the order using wallet data since validateAndCreateOrder was skipped
      const expressCheckoutData = paymentIntentResult.expressCheckoutData;
      if (expressCheckoutData && !orderNum) {
        console.log('🍎 Express Checkout detected - creating order with wallet data');

        // Extract customer info from wallet
        const walletShipping = expressCheckoutData.shippingAddress || {};
        const walletBilling = expressCheckoutData.billingDetails || {};
        const payerName = expressCheckoutData.payerName || walletBilling.name || '';
        const payerEmail = expressCheckoutData.payerEmail || walletBilling.email || '';
        const payerPhone = expressCheckoutData.payerPhone || walletBilling.phone || walletShipping.phone || '';

        // Parse name
        const nameParts = payerName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Build shipping info from wallet data
        shippingInfo = {
          firstName,
          lastName,
          companyName: '',
          address: walletShipping.line1 || walletShipping.address?.line1 || '',
          apartment: walletShipping.line2 || walletShipping.address?.line2 || '',
          country: walletShipping.country || walletShipping.address?.country || 'United Kingdom',
          city: walletShipping.city || walletShipping.address?.city || '',
          county: walletShipping.state || walletShipping.address?.state || '',
          postalCode: walletShipping.postal_code || walletShipping.address?.postal_code || '',
          phoneNumber: payerPhone,
        };

        // Store shipping info for order creation
        localStorage.setItem('shippingInformation', JSON.stringify(shippingInfo));

        // Store user for order
        orderService.storeUserForOrder({
          email: payerEmail,
          _id: 'express_checkout_user',
        });

        // Create order with wallet data
        try {
          const orderResult = await orderService.createOrder({
            cart: cartData,
            shippingInformation: shippingInfo,
            contactInformation: { email: payerEmail, userId: 'express_checkout' },
            coupon: appliedCouponData,
            status: 'Processing',
            shippingMethod: selectedShippingMethod ? {
              name: selectedShippingMethod.name,
              price: shippingCost,
              estimatedDays: selectedShippingMethod.estimatedDays,
              methodId: selectedShippingMethod._id,
            } : null,
          });

          if (orderResult && orderResult.orderNumber) {
            orderNum = orderResult.orderNumber;
            setCurrentOrderNumber(orderNum);
            console.log('✅ Express checkout order created:', orderNum);

            // Update PaymentIntent metadata with order number
            if (paymentIntentId) {
              try {
                const fullAddress = `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.postalCode}`;
                await api.updatePaymentIntentMetadata({
                  paymentIntentId,
                  orderNumber: orderNum,
                  email: payerEmail,
                  phoneNumber: payerPhone,
                  customerName: payerName,
                  shippingAddress: fullAddress,
                  shippingMethod: selectedShippingMethod ? {
                    name: selectedShippingMethod.name,
                    price: shippingCost,
                    estimatedDays: selectedShippingMethod.estimatedDays,
                    methodId: selectedShippingMethod._id,
                  } : null,
                });
                console.log('✅ PaymentIntent metadata updated with order number');
              } catch (metadataError) {
                console.error('Failed to update PaymentIntent metadata:', metadataError);
              }
            }
          }
        } catch (orderError: any) {
          console.error('Failed to create express checkout order:', orderError);
          // Continue anyway - webhook can handle this
        }
      }

      console.log('💳 Payment successful! Order:', orderNum);
      console.log('🔔 Webhook will update order status to Pending');

      // Get contact information
      const userForOrder = JSON.parse(localStorage.getItem('userForOrder') || '{}');
      const contactInformation: { email?: string; userId?: string } = {};

      if (userForOrder && userForOrder.email && userForOrder._id) {
        contactInformation.email = userForOrder.email;
        contactInformation.userId = userForOrder._id;
      } else if (auth.user) {
        contactInformation.email = auth.user.email;
        contactInformation.userId = auth.user._id;
      }

      // Calculate total order value for analytics
      let totalOrderValue = cartData
        .reduce((sum: number, item: any) => {
          return sum + parseFloat((item.salePrice * item.qty).toFixed(2));
        }, 0);

      if (appliedCouponData) {
        if (appliedCouponData.discount_type === 'flat') {
          totalOrderValue -= appliedCouponData.discount;
        } else if (appliedCouponData.discount_type === 'percentage') {
          const discountAmount = (totalOrderValue * appliedCouponData.discount) / 100;
          totalOrderValue -= appliedCouponData.upto
            ? Math.min(discountAmount, appliedCouponData.upto)
            : discountAmount;
        }
      }
      totalOrderValue = Math.max(0, totalOrderValue);

      // Store order data for thank-you page
      const orderForThankYou = {
        totalOrderValue,
        orderNumber: orderNum || '',
        cart: cartData.map((item: any) => ({
          productName: item.productName || item.name,
          productId: item.productId || item._id,
          qty: item.qty,
          salePrice: item.salePrice,
        })),
        customerEmail: contactInformation.email || '',
        customerName: shippingInfo
          ? `${shippingInfo.firstName || ''} ${shippingInfo.lastName || ''}`.trim()
          : '',
      };
      localStorage.setItem('lastOrder', JSON.stringify(orderForThankYou));

      // Clean up localStorage
      localStorage.removeItem('clientSecret');
      localStorage.removeItem('cart');
      localStorage.removeItem('appliedcoupon');
      localStorage.removeItem('paymentIntentId');
      localStorage.removeItem('paymentIntentCreatedAt');
      localStorage.removeItem('paymentIntentCreating');
      localStorage.removeItem('cart-old');
      localStorage.removeItem('createdOrderNumber');
      localStorage.removeItem('shippingInformation');
      localStorage.removeItem('userForOrder');

      setProgress(100);

      // Navigate to thank-you page
      router.push('/checkout/thank-you');

    } catch (error: any) {
      console.error('❌ Error in payment success handler:', error);
      // Clean up and redirect anyway
      localStorage.removeItem('clientSecret');
      localStorage.removeItem('cart');
      localStorage.removeItem('paymentIntentId');
      localStorage.removeItem('paymentIntentCreatedAt');
      localStorage.removeItem('paymentIntentCreating');
      router.push('/checkout/thank-you');
    }
  }, [currentOrderNumber, auth.user, router, orderService, paymentIntentId, setCurrentOrderNumber, selectedShippingMethod, shippingCost]);

  // Reset payment state (e.g., if user wants to go back and modify order)
  const resetPaymentState = useCallback(() => {
    setIsPaymentReady(false);
    setPaymentIntentId(null);
    setClientSecret('');
    setPaymentError('');
    setCurrentOrderNumber(null);
    paymentService.clearPaymentData();
  }, [paymentService]);

  // Validate and create order before payment (called by PaymentForm)
  const validateAndCreateOrder = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setProgress(50);
    setIsProcessingPayment(true);
    setPaymentError('');
    setGeneralError('');

    try {
      // Validate terms
      const termsError = ValidationService.validateTermsAccepted(isChecked);
      if (termsError) {
        setShowWarning(true);
        setProgress(100);
        setIsProcessingPayment(false);
        return { success: false, error: termsError };
      }

      // Validate cart
      const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
      if (!ValidationService.validateCartData(cartData)) {
        setProgress(100);
        setIsProcessingPayment(false);
        return { success: false, error: 'Your cart is empty' };
      }

      // Validate shipping form
      const validationErrors = ValidationService.validateShippingInformation(shippingInformation);
      if (ValidationService.hasValidationErrors(validationErrors)) {
        const cleanErrors = ValidationService.getCleanErrors();
        setErrors({
          ...cleanErrors,
          firstName: validationErrors.firstName || cleanErrors.firstName,
          lastName: validationErrors.lastName || cleanErrors.lastName,
          phoneNumber: validationErrors.phoneNumber || cleanErrors.phoneNumber,
          address: validationErrors.address || cleanErrors.address,
          postalCode: validationErrors.postalCode || cleanErrors.postalCode
        });
        setProgress(100);
        setIsProcessingPayment(false);
        return { success: false, error: 'Please fill in all required shipping fields' };
      }

      // Check if user is logged in, if not - register them first
      let validContactInfo = orderService.validateContactInformation(
        userState,
        contactInfo,
        contactInfo
      );

      if (!validContactInfo) {
        // User is not logged in - try to register them
        console.log('👤 User not logged in. Attempting registration...');

        // Validate registration fields
        if (!email || !email.includes('@')) {
          setProgress(100);
          setIsProcessingPayment(false);
          return { success: false, error: 'Please enter a valid email address' };
        }

        if (!password || password.length < 6) {
          setProgress(100);
          setIsProcessingPayment(false);
          return { success: false, error: 'Please enter a password (minimum 6 characters)' };
        }

        if (password !== confirmPassword) {
          setProgress(100);
          setIsProcessingPayment(false);
          return { success: false, error: 'Passwords do not match' };
        }

        try {
          // Register the user
          const registerResponse = await authService.register(email, password, confirmPassword, shippingInformation);

          if (registerResponse && registerResponse.status === 201 && registerResponse.user) {
            console.log('✅ User registered successfully:', registerResponse.user.email);

            // Store user for order
            orderService.storeUserForOrder({
              email: registerResponse.user.email,
              _id: registerResponse.user._id,
            });

            // Update contact info with new user
            validContactInfo = {
              email: registerResponse.user.email,
              userId: registerResponse.user._id,
            };

            // Update Redux state
            dispatch(setUser({
              email: registerResponse.user.email,
              userId: registerResponse.user._id,
            }));

          } else if (registerResponse && registerResponse.message) {
            // Registration failed with specific error
            setProgress(100);
            setIsProcessingPayment(false);
            return { success: false, error: registerResponse.message };
          } else {
            setProgress(100);
            setIsProcessingPayment(false);
            return { success: false, error: 'Registration failed. Please try again.' };
          }
        } catch (regError: any) {
          console.error('Registration error:', regError);
          setProgress(100);
          setIsProcessingPayment(false);
          return { success: false, error: regError.message || 'Registration failed. Please try again.' };
        }
      }

      if (!validContactInfo) {
        setProgress(100);
        setIsProcessingPayment(false);
        return { success: false, error: 'Invalid contact information. Please log in or register.' };
      }

      // Create order with "Failed" status
      const orderData = {
        cart: cartData,
        shippingInformation,
        contactInformation: validContactInfo,
        coupon: appliedCoupon,
        orderNumber: orderService.getStoredOrderNumber(),
        status: 'Failed',
        shippingMethod: selectedShippingMethod ? {
          name: selectedShippingMethod.name,
          price: shippingCost,
          estimatedDays: selectedShippingMethod.estimatedDays,
          methodId: selectedShippingMethod._id,
        } : null,
      };

      const orderResponse = await orderService.createOrder(orderData);
      console.log('📦 Order created response:', orderResponse);

      if (!orderResponse || !orderResponse.orderNumber) {
        setProgress(100);
        setIsProcessingPayment(false);
        return { success: false, error: 'Failed to create order. Please try again.' };
      }

      // Store order number
      const orderNum = orderResponse.orderNumber;
      setCurrentOrderNumber(orderNum);
      orderService.storeOrderNumber(orderNum);
      console.log('💾 Order number stored:', orderNum);

      // Store shipping information for retrieval after payment
      localStorage.setItem('shippingInformation', JSON.stringify(shippingInformation));
      localStorage.setItem('cart-old', JSON.stringify(cartData));

      // Store user for order
      orderService.storeUserForOrder({
        email: validContactInfo.email,
        _id: validContactInfo.userId,
      });

      // Update PaymentIntent metadata with order number and full details so webhook can find the order
      const storedPaymentIntentId = localStorage.getItem('paymentIntentId');
      if (storedPaymentIntentId) {
        try {
          const customerName = `${shippingInformation.firstName} ${shippingInformation.lastName}`.trim();
          const fullAddress = [
            shippingInformation.address,
            shippingInformation.apartment,
            shippingInformation.city,
            shippingInformation.county,
            shippingInformation.postalCode,
            shippingInformation.country || 'United Kingdom'
          ].filter(Boolean).join(', ');

          await api.updatePaymentIntentMetadata({
            paymentIntentId: storedPaymentIntentId,
            orderNumber: orderNum,
            email: validContactInfo.email,
            phoneNumber: shippingInformation.phoneNumber,
            customerName: customerName,
            shippingAddress: fullAddress,
            shippingMethod: selectedShippingMethod ? {
              name: selectedShippingMethod.name,
              price: shippingCost,
              estimatedDays: selectedShippingMethod.estimatedDays,
              methodId: selectedShippingMethod._id,
            } : null,
          });
          console.log('✅ PaymentIntent metadata updated with order number and customer details');
        } catch (error) {
          console.error('⚠️ Failed to update PaymentIntent metadata:', error);
          // Continue anyway - the order is created and payment can proceed
        }
      }

      console.log('✅ Order validated and created. Proceeding with existing PaymentIntent.');

      setProgress(100);
      // Keep isProcessingPayment true while payment processes
      return { success: true };

    } catch (error: any) {
      console.error('Validation failed:', error);
      setProgress(100);
      setIsProcessingPayment(false);
      return { success: false, error: error.message || 'Validation failed. Please try again.' };
    }
  }, [isChecked, shippingInformation, contactInfo, userState, appliedCoupon, orderService, email, password, confirmPassword, authService, dispatch, selectedShippingMethod, shippingCost]);

  const handleRegisterAndPlaceOrder = async () => {
    try {
      const registerSuccess = await handleRegister();
      if (registerSuccess) {
        const loginSuccess = await handleLogin();
        if (loginSuccess) {
          orderService.storeUserForOrder({
            email: loginSuccess.email,
            _id: loginSuccess._id,
          });

          setContactInfo({
            email: loginSuccess.email,
            userId: loginSuccess._id,
          });

          auth.login(loginSuccess);

          // Delay to ensure state updates
          setTimeout(async () => {
            try {
              await handlePlaceOrder();
            } catch (error) {
              console.error('Error in delayed handlePlaceOrder:', error);
              setGeneralError('Error placing order. Please try again.');
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error during registration and order confirmation:', error);
      setGeneralError('Error during registration and order confirmation. Please try again.');
    }
  };

  return {
    // State
    progress,
    products,
    errors,
    shippingInformation,
    contactInfo,
    coupons,
    appliedCoupon,
    enteredCoupon,
    isCouponValid,
    couponError,
    totalSalePrice,
    discountedPrice,
    stripePromise,
    clientSecret,
    paymentDetailsFetched,
    email,
    password,
    confirmPassword,
    isChecked,
    showWarning,
    generalError,

    // Shipping state
    shippingMethods,
    selectedShippingMethod,
    shippingCost,
    freeShippingThreshold,
    freeShippingEnabled,

    // Embedded payment state
    isPaymentReady,
    paymentIntentId,
    isProcessingPayment,
    paymentError,
    currentOrderNumber,

    // Setters
    setProgress,
    setEmail,
    setPassword,
    setConfirmPassword,
    setShippingInformation,

    // Handlers
    handleLogin,
    handleRegister,
    handleCouponInputChange,
    handleApplyCoupon,
    handleShippingChange,
    handleTermsCheckboxChange,
    handleShippingMethodChange,
    removeFromCart,
    handlePlaceOrder,
    handleRegisterAndPlaceOrder,

    // Embedded payment handlers
    handlePaymentSuccess,
    resetPaymentState,
    validateAndCreateOrder,
  };
};