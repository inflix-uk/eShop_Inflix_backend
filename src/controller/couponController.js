//  coontroller/couponController.js
const db = require("../../connections/mongo");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const Coupon = require("../models/coupon");



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
               const coupon = await Coupon.findById(id);
            if (!coupon) {
                return res.json({ message: "Coupon not found", status: 404 });
            }

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