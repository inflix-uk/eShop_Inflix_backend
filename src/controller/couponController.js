//  coontroller/couponController.js
const db = require("../../connections/mongo");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
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
               const coupon = await Coupon.find();
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

}
module.exports = couponController;