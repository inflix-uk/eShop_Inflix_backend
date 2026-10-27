//  coontroller/couponController.js
const mongoose = require("mongoose");
const Coupon = require("../models/coupon");
const Order = require("../models/order");
const User = require("../models/user");
const { calculateDiscountAmount } = require("../services/pricing/resolveCoupon");

const WALLET_USER_IDS = new Set(["express_checkout", "express_checkout_user", "pending"]);

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function roundMoney(n) {
    return Math.round(Number(n) * 100) / 100;
}

function couponOnOrder(order) {
    const coupon = order?.coupon;
    if (!coupon) return null;
    if (Array.isArray(coupon)) {
        return coupon.find((entry) => entry && entry.code) || null;
    }
    if (typeof coupon === "object" && coupon.code) return coupon;
    return null;
}

function cartProductSubtotal(cart) {
    const items = Array.isArray(cart) ? cart : null;
    if (!items || items.length === 0) return null;

    const sum = items.reduce((total, item) => {
        if (!item || item.isTradeIn || item.productId === "trade-in") return total;
        const price = Number(item.salePrice ?? item.Price ?? item.price);
        const qty = Number(item.qty ?? item.quantity ?? 1);
        if (!Number.isFinite(price) || !Number.isFinite(qty)) return total;
        return total + price * qty;
    }, 0);

    return sum > 0 ? roundMoney(sum) : null;
}

function inferDiscountFromPaidTotal(paidTotal, coupon) {
    const paid = Number(paidTotal);
    if (!coupon || !Number.isFinite(paid)) return null;

    if (coupon.discount_type === "flat") {
        const flat = Number(coupon.discount) || 0;
        if (paid <= 0) return null;
        return roundMoney(flat);
    }

    if (coupon.discount_type === "percentage") {
        const percent = Number(coupon.discount) || 0;
        if (percent <= 0 || percent >= 100) return null;
        const uncapped = paid * (percent / (100 - percent));
        const cap = coupon.upto ? Number(coupon.upto) : null;
        const discount = cap && uncapped > cap ? cap : uncapped;
        return roundMoney(discount);
    }

    return null;
}

function displayName({ user, shipping, userId }) {
    const fromShipping = [shipping?.firstName, shipping?.lastName].filter(Boolean).join(" ").trim();
    if (fromShipping) return fromShipping;

    const fromUser = [user?.firstname, user?.lastname].filter(Boolean).join(" ").trim();
    if (fromUser) return fromUser;

    if (WALLET_USER_IDS.has(String(userId || ""))) return "Wallet checkout";
    return "Guest";
}

async function buildCouponUsage(coupon) {
    const code = String(coupon.code || "").trim();
    if (!code) {
        return { rows: [], totalDiscount: 0 };
    }

    const codePattern = new RegExp(`^${escapeRegex(code)}$`, "i");
    const orders = await Order.find({
        isdeleted: { $ne: true },
        status: { $nin: ["Failed", "deleted"] },
        "coupon.code": codePattern,
    })
        .select("orderNumber contactDetails shippingDetails totalOrderValue coupon status createdAt cart")
        .sort({ createdAt: -1 })
        .lean();

    const historyByOrder = new Map();
    for (const entry of coupon.usageHistory || []) {
        if (entry?.orderId) historyByOrder.set(String(entry.orderId), entry);
    }

    const matchedOrderNumbers = new Set(orders.map((order) => String(order.orderNumber || "")));

    const userIds = new Set();
    const collectUserId = (userId) => {
        const id = String(userId || "").trim();
        if (id && mongoose.Types.ObjectId.isValid(id) && !WALLET_USER_IDS.has(id)) {
            userIds.add(id);
        }
    };

    orders.forEach((order) => collectUserId(order.contactDetails?.userId));
    for (const entry of coupon.usageHistory || []) {
        if (!matchedOrderNumbers.has(String(entry.orderId || ""))) {
            collectUserId(entry.userId);
        }
    }

    const users = userIds.size
        ? await User.find({ _id: { $in: [...userIds] } }).select("firstname lastname email").lean()
        : [];
    const usersById = new Map(users.map((user) => [String(user._id), user]));

    const rows = orders.map((order) => {
        const history = historyByOrder.get(String(order.orderNumber || ""));
        const userId = history?.userId || order.contactDetails?.userId || "";
        const user = usersById.get(String(userId));
        const appliedCoupon = couponOnOrder(order) || coupon;
        const subtotal = cartProductSubtotal(order.cart);
        const discount = subtotal != null
            ? calculateDiscountAmount(subtotal, appliedCoupon)
            : inferDiscountFromPaidTotal(order.totalOrderValue, appliedCoupon);

        return {
            id: String(order._id),
            orderNumber: order.orderNumber || "—",
            user: displayName({
                user,
                shipping: order.shippingDetails,
                userId,
            }),
            email: order.contactDetails?.email || user?.email || "—",
            date: history?.usedAt || order.createdAt || null,
            orderAmount: Number.isFinite(Number(order.totalOrderValue)) ? roundMoney(order.totalOrderValue) : null,
            discount: Number.isFinite(Number(discount)) ? roundMoney(discount) : null,
            status: order.status || "—",
        };
    });

    for (const entry of coupon.usageHistory || []) {
        const orderId = String(entry.orderId || "");
        if (!orderId || matchedOrderNumbers.has(orderId)) continue;
        const user = usersById.get(String(entry.userId || ""));
        rows.push({
            id: String(entry._id || `${orderId}-${entry.userId || "unknown"}`),
            orderNumber: orderId,
            user: displayName({ user, shipping: null, userId: entry.userId }),
            email: user?.email || "—",
            date: entry.usedAt || null,
            orderAmount: null,
            discount: null,
            status: "Recorded",
        });
    }

    rows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const totalDiscount = roundMoney(
        rows.reduce((sum, row) => sum + (Number(row.discount) || 0), 0)
    );

    return { rows, totalDiscount };
}



const couponController = {
    createCoupon: async (req, res) => {
        try {
            // Extract user data from the request body
            const { code, type, discount, usage, expiryDate, upto, allowMultiple, minOrderValue } = req.body;
        
            // Create a new Coupon instance
            const newCoupon = new Coupon({
                code,
                discount_type: type, 
                discount: discount, 
                usage,
                used: 0, 
                expiryDate,
                upto,
                status: 1,
                allowMultiple,
                minOrderValue
            });
        
            // Save the coupon to the database
            const savedCoupon = await newCoupon.save();
        
            // Respond with success
            res.json({ message: "Coupon created successfully", coupon: savedCoupon, status: 201 });
        }  catch (error) {
            // Handle errors
            console.error("Error creating order:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },
    getAllCoupon: async (req, res) => {
        try {
            // Extract user data from the request body
               const coupon = await Coupon.find().lean();
               res.json({
                   message: 'Coupon retrieved successfully',
                   coupon,
                   status: 201
               });
        } catch (error) {
            // Handle errors
            console.error("Error creating order:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },
    getCouponById: async (req, res) => {
        try {

            const { id } = req.params;
        
            // Extract user data from the request body
               const coupon = await Coupon.findById(id).lean();
            if (!coupon) {
                return res.json({ message: "Coupon not found", status: 404 });
            }

            const usage = await buildCouponUsage(coupon);

               res.json({
                   message: 'Coupon retrieved successfully',
                   coupon,
                   usage: usage.rows,
                   totalDiscount: usage.totalDiscount,
                   status: 201
               });
        } catch (error) {
            // Handle errors
            console.error("Error creating order:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },
    stausCoupon: async (req, res) => {
        try {
            // Extract user data from the request body
               const coupon = await Coupon.findById(req.params.id);
               res.json({
                   message: 'Coupon retrieved successfully',
                   coupon,
                   status: 201
               });
        } catch (error) {
            // Handle errors
            console.error("Error creating order:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },
    updateCoupon: async (req, res) => {
        try {
            // Extract the coupon ID from the request parameters
            const { id } = req.params;
    
            // Extract the updated coupon data from the request body
            const { code, type, discount, usage, expiryDate, upto ,allowMultiple, minOrderValue } = req.body;
console.log(req.body);
    
            // Find the coupon by ID and update it with the new data
            const updatedCoupon = await Coupon.findByIdAndUpdate(
                id,
                {
                    code,
                    discount_type: type, 
                    discount, 
                    usage,
                    upto,
                    expiryDate,
                    allowMultiple,
                    minOrderValue
                },
                { new: true } // This option returns the updated document
            );
    
            // If the coupon was not found, return a 404 response
            if (!updatedCoupon) {
                return res.json({ message: "Coupon not found", status: 404 });
            }
    
            // Respond with the updated coupon
            res.json({
                message: 'Coupon updated successfully',
                coupon: updatedCoupon,
                status: 201
            });

        }  catch (error) {
            // Handle errors
            console.error("Error creating order:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },
    deleteCoupon: async (req, res) => {
        try {
            // Extract the coupon ID from the request parameters
            const { id } = req.params;
    
            // Find the coupon by ID and delete it
            const deletedCoupon = await Coupon.findByIdAndDelete(id);
    
            // If the coupon was not found, return a 404 response
            if (!deletedCoupon) {
                return res.json({ message: "Coupon not found", status: 404 });
            }
    
            // Respond with a success message
            res.json({
                message: 'Coupon deleted successfully',
                coupon: deletedCoupon,
                status: 200
            });
        }  catch (error) {
            // Handle errors
            console.error("Error creating order:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },

    /**
     * Public storefront endpoint: validate a single coupon by code.
     * Does not list all coupons (admin-only).
     */
    validateCouponForCheckout: async (req, res) => {
        try {
            const rawCode = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
            const cartTotal = Number(req.body?.cartTotal) || 0;
            const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';

            if (!rawCode) {
                return res.status(400).json({
                    success: false,
                    message: 'Coupon code is required',
                    status: 400,
                });
            }

            const coupon = await Coupon.findOne({
                code: { $regex: new RegExp(`^${rawCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            }).lean();

            if (!coupon || coupon.status === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Invalid coupon code',
                    status: 404,
                });
            }

            if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'This coupon has expired.',
                    status: 400,
                });
            }

            if (typeof coupon.usage === 'number' && coupon.usage > 0 && (coupon.used || 0) >= coupon.usage) {
                return res.status(400).json({
                    success: false,
                    message: 'This coupon is no longer available.',
                    status: 400,
                });
            }

            if (coupon.minOrderValue > 0 && cartTotal < coupon.minOrderValue) {
                return res.status(400).json({
                    success: false,
                    message: `This coupon requires a minimum order of £${coupon.minOrderValue}.`,
                    status: 400,
                });
            }

            if (userId && !coupon.allowMultiple && Array.isArray(coupon.usageHistory)) {
                const alreadyUsed = coupon.usageHistory.some(
                    (usage) => String(usage.userId) === String(userId)
                );
                if (alreadyUsed) {
                    return res.status(400).json({
                        success: false,
                        message: 'You have already used this coupon.',
                        status: 400,
                    });
                }
            }

            const { usageHistory, ...safeCoupon } = coupon;

            return res.json({
                success: true,
                message: 'Coupon is valid',
                coupon: safeCoupon,
                status: 201,
            });
        } catch (error) {
            console.error('Error validating coupon:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                status: 500,
            });
        }
    },

}
module.exports = couponController;