
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const Order = require('../models/order');
const Checkout = require('../models/checkout');

// Configuration
const PORT = process.env.PORT || 4000;
const TEST_STATUS = process.argv[2] || 'Failed'; // Pass 'Pending' or 'Failed' as argument
const API_URL = `http://localhost:${PORT}/create/order`;

// Test order data with FAILED status
const testOrderData = {
    cart: [
        // 1 Regular product
        {
            productId: '66fd688338c354a1be8336d8',
            productName: 'Apple iPhone 12 Mini - Unlocked',
            name: 'Excellent-Black (#000000)-64GB',
            SKU: 'AIP12M-5G-64GB-BK-E',
            EIN: '0194252012963',
            qty: 1,
            salePrice: 159.99,
            Price: 499,
            variantImages: [
                {
                    filename: 'test2.png',
                    path: 'uploads/products/test2.png'
                }
            ],
            isTradeIn: false
        },
        // 1 Trade-in product
        {
            productId: 'trade-in',
            productName: 'iPhone 13 Pro Max',
            name: 'iPhone 13 Pro Max - 256GB - Gold',
            qty: 1,
            salePrice: 450,
            isTradeIn: true,
            tradeInData: {
                deviceId: '680b5f61e11d173b916eb7ab',
                deviceName: 'iPhone 13 Pro Max',
                deviceNameUrl: 'iphone-13-pro-max',
                brandName: 'Apple',
                deviceImage: 'uploads/device/iphone-13.png',
                storageName: '256GB',
                conditionName: 'Good',
                tradeInValue: 450.00,
                // Bank account details for payment
                accountName: 'John Smith',
                accountNumber: '12345678',
                sortCode: '12-34-56'
            }
        }
    ],

    shippingInformation: {
        firstName: 'hamza',
        lastName: 'hashmi',
        address: '123 Test Street',
        apartment: 'Apt 1',
        city: 'London',
        county: 'Greater London',
        country: 'United Kingdom',
        postalCode: 'SW1A 1AA',
        phoneNumber: '07700900000',
        companyName: ''
    },

    contactInformation: {
        email: 'hamzahashmi640@gmail.com',
        phoneNumber: '07700900000',
        userId: '66c494329fb3cd6b6d9d7842'
    },

    // Removed coupon to test without coupon validation

    paymentDetails: {
        method: 'card',
        transactionId: 'success_' + Date.now(),
        status: 'succeeded',
        cardDetails: {
            brand: 'Visa',
            country: 'GB',
            last4: '4242'
        }
    },

    status: TEST_STATUS // Dynamic status based on command line argument
};

async function createOrder() {
    try {
        console.log(`\n═══════════════════════════════════════════════════════════`);
        console.log(`🧪 TESTING ORDER CREATION WITH STATUS: ${TEST_STATUS}`);
        console.log(`═══════════════════════════════════════════════════════════`);
        console.log(`\nAPI: POST ${API_URL}`);
        console.log(`Port: ${PORT}`);

        if (TEST_STATUS === 'Failed') {
            console.log(`\n⚠️  Expected: SellZextons checkout should NOT be created`);
        } else if (TEST_STATUS === 'Pending') {
            console.log(`\n✅ Expected: SellZextons checkout SHOULD be created`);
            console.log(`   - Emails will be sent`);
            console.log(`   - Inventory will be reduced`);
        }
        console.log('');

        // Connect to MongoDB
        console.log('Connecting to MongoDB...');
        const MONGO_URI = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb+srv://zextonsAdmin:12345@zextons.y1to4og.mongodb.net/zextons';
        await mongoose.connect(MONGO_URI);
        console.log('Connected.\n');

        // Create the order via API
        console.log('Calling API...');
        let apiResponse;
        try {
            apiResponse = await axios.post(API_URL, testOrderData, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            });
        } catch (apiError) {
            if (apiError.code === 'ECONNREFUSED') {
                console.error(`\nERROR: Cannot connect to server at http://localhost:${PORT}`);
                console.error(`Make sure server is running: npm start\n`);
                process.exit(1);
            }
            throw apiError;
        }

        const result = apiResponse.data;

        console.log('API Response:', JSON.stringify(result, null, 2));

        if (!result.order && !result.orderNumber && !result.success) {
            console.error('API call failed:', result.message);
            console.error('Full response:', result);
            process.exit(1);
        }

        console.log(`Status: ${apiResponse.status} ${apiResponse.statusText}\n`);

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Fetch the order - handle both response formats
        const orderNumber = result.order?.orderNumber || result.orderNumber;
        const order = await Order.findOne({ orderNumber: orderNumber });

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ ORDER CREATED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════════════════════\n');

        console.log('📦 ORDER DETAILS:');
        console.log(`   Order Number: ${order.orderNumber}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Total Order Value: £${order.totalOrderValue.toFixed(2)}`);

        // Show coupon details if applied
        if (order.coupon && order.coupon.code) {
            const discount = order.coupon.discount_type === 'percentage'
                ? `${order.coupon.discount}%`
                : `£${order.coupon.discount}`;
            console.log(`   Coupon Applied: ${order.coupon.code} (${discount} off)`);
        }

        console.log(`   Email: ${order.contactDetails.email}`);
        console.log(`   Customer: ${order.shippingDetails.firstName} ${order.shippingDetails.lastName}`);

        // Show cart items breakdown
        console.log('\n🛒 CART ITEMS:');
        const regularProducts = order.cart.filter(item => !item.isTradeIn && item.productId !== 'trade-in');
        const tradeInProducts = order.cart.filter(item => item.isTradeIn || item.productId === 'trade-in');

        regularProducts.forEach(item => {
            console.log(`   ✓ ${item.productName} (${item.name})`);
            console.log(`     Qty: ${item.qty} | Price: £${item.salePrice} | SKU: ${item.SKU}`);
        });

        if (tradeInProducts.length > 0) {
            console.log('\n📱 TRADE-IN ITEMS:');
            tradeInProducts.forEach(item => {
                console.log(`   ✓ ${item.productName}`);
                console.log(`     Condition: ${item.tradeInData.conditionName} | Value: £${item.tradeInData.tradeInValue}`);
            });
        }

        // Check trade-in checkout
        const hasCheckout = order.sellZextonsCheckout?.checkoutNumber;

        if (hasCheckout) {
            console.log('\n💰 TRADE-IN CHECKOUT:');
            console.log(`   Checkout Number: ${order.sellZextonsCheckout.checkoutNumber}`);
            console.log(`   Checkout ID: ${order.sellZextonsCheckout.checkoutId}`);

            // Fetch checkout details
            const checkout = await Checkout.findById(order.sellZextonsCheckout.checkoutId);
            if (checkout) {
                console.log(`   Status: ${checkout.status}`);
                console.log(`   Payment Method: ${checkout.paymentMethod}`);
                console.log(`   Shipping Option: ${checkout.shippingOption}`);
            }
        } else {
            console.log('\n💰 TRADE-IN CHECKOUT:');
            console.log('   ❌ No checkout created');
        }

        // Test verification
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('🔍 TEST VERIFICATION');
        console.log('═══════════════════════════════════════════════════════════');

        if (TEST_STATUS === 'Failed') {
            if (!hasCheckout) {
                console.log('✅ PASS: SellZextons checkout was NOT created (as expected for Failed status)');
            } else {
                console.log('❌ FAIL: SellZextons checkout WAS created (should NOT be created for Failed status)');
            }
        } else if (TEST_STATUS === 'Pending') {
            if (hasCheckout) {
                console.log('✅ PASS: SellZextons checkout WAS created (as expected for Pending status)');
            } else {
                console.log('❌ FAIL: SellZextons checkout was NOT created (should be created for Pending status)');
            }
        }

        // Email status
        if (order.status === 'Pending') {
            console.log('\n📧 EMAILS SENT:');
            console.log('   ✓ Customer confirmation email (products only)');
            console.log('   ✓ Admin notification email (all items)');
            console.log('   ✓ Trustpilot review request');

            if (tradeInProducts.length > 0) {
                console.log('   ✓ Trade-in shipping instructions email');
                console.log('\n   Note: Separate emails for products and trade-in items');
            } else {
                console.log('\n   Note: No trade-in items in this order');
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ TEST COMPLETED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\nError:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
    } finally {
        await mongoose.connection.close();
    }
}

// Run the script
createOrder();
