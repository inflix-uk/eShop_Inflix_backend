const mongoose = require('mongoose');
const Deal = require('../models/deal');

const dealsController = {
    createDeal: async (req, res) => {
        try {
            const { title, desc, type, startDate, hasExpiry, expiryDate, link, buttonText, couponCode, emoji, isPublish } = req.body;

            // Validate based on type
            if (type === 'Deal' && !link) {
                return res.status(400).json({ error: 'Link is required for Deal type' });
            }
            if (type === 'Coupon' && !couponCode) {
                return res.status(400).json({ error: 'Coupon code is required for Coupon type' });
            }

            // If hasExpiry is false, ensure expiryDate is null
            const finalHasExpiry = hasExpiry !== undefined ? hasExpiry : true;
            const finalExpiryDate = finalHasExpiry ? (expiryDate ? new Date(expiryDate) : null) : null;

            const newDeal = new Deal({
                title,
                desc,
                type,
                startDate: startDate ? new Date(startDate) : null,
                hasExpiry: finalHasExpiry,
                expiryDate: finalExpiryDate,
                link: type === 'Deal' ? link : null,
                buttonText: type === 'Deal' ? buttonText : null,
                couponCode: type === 'Coupon' ? couponCode : null,
                emoji,
                isPublish
            });

            await newDeal.save();
            
            // Format response with expiryText
            const dealResponse = newDeal.toObject();
            dealResponse.expiryText = finalHasExpiry && finalExpiryDate 
                ? finalExpiryDate.toLocaleDateString() 
                : 'No Expiry';
            
            return res.json({ message: 'Deal created successfully', status: 201, deal: dealResponse });
        } catch (error) {
            console.error('Error creating deal:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },

    getAllDeals: async (req, res) => {
        try {
            const deals = await Deal.find().sort({ createdAt: -1 });
            const dealsWithExpiryText = deals.map(deal => {
                const dealObj = deal.toObject();
                dealObj.expiryText = deal.hasExpiry && deal.expiryDate 
                    ? new Date(deal.expiryDate).toLocaleDateString() 
                    : 'No Expiry';
                return dealObj;
            });
            return res.json({ message: 'Deals fetched successfully', status: 200, deals: dealsWithExpiryText });
        } catch (error) {
            console.error('Error fetching deals:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },

    getActiveDeals: async (req, res) => {
        try {
            const deals = await Deal.find({
                isPublish: true
            }).sort({ createdAt: -1 });
            const dealsWithExpiryText = deals.map(deal => {
                const dealObj = deal.toObject();
                dealObj.expiryText = deal.hasExpiry && deal.expiryDate 
                    ? new Date(deal.expiryDate).toLocaleDateString() 
                    : 'No Expiry';
                return dealObj;
            });
            return res.json({ message: 'Active deals fetched successfully', status: 200, deals: dealsWithExpiryText });
        } catch (error) {
            console.error('Error fetching active deals:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },

    getDealById: async (req, res) => {
        try {
            const { id } = req.params;
            const deal = await Deal.findById(id);
            if (!deal) {
                return res.status(404).json({ error: 'Deal not found' });
            }
            const dealObj = deal.toObject();
            dealObj.expiryText = deal.hasExpiry && deal.expiryDate 
                ? new Date(deal.expiryDate).toLocaleDateString() 
                : 'No Expiry';
            return res.json({ message: 'Deal fetched successfully', status: 200, deal: dealObj });
        } catch (error) {
            console.error('Error getting deal:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },

    updateDeal: async (req, res) => {
        try {
            const { id } = req.params;
            const { title, desc, type, startDate, hasExpiry, expiryDate, link, buttonText, couponCode, emoji, isPublish, isExpired } = req.body;

            // Get existing deal to check current type
            const existingDeal = await Deal.findById(id);
            if (!existingDeal) {
                return res.status(404).json({ error: 'Deal not found' });
            }

            // Determine the type to use (new type or existing)
            const dealType = type !== undefined ? type : existingDeal.type;

            // Validate based on type
            if (dealType === 'Deal') {
                // For Deal type, if link is being set, ensure it's provided
                if (link !== undefined && !link) {
                    return res.status(400).json({ error: 'Link is required for Deal type' });
                }
            }
            if (dealType === 'Coupon') {
                // For Coupon type, if couponCode is being set, ensure it's provided
                if (couponCode !== undefined && !couponCode) {
                    return res.status(400).json({ error: 'Coupon code is required for Coupon type' });
                }
            }

            const update = {
                title,
                desc,
                emoji,
                isPublish,
                isExpired,
                updatedAt: new Date()
            };

            // Set type if provided
            if (type !== undefined) {
                update.type = type;
            }

            // Handle hasExpiry and expiryDate
            const finalHasExpiry = hasExpiry !== undefined ? hasExpiry : existingDeal.hasExpiry;
            
            if (hasExpiry !== undefined) {
                update.hasExpiry = finalHasExpiry;
            }
            
            // If hasExpiry is false, set expiryDate to null
            // If hasExpiry is true and expiryDate is provided, use it
            if (finalHasExpiry === false) {
                update.expiryDate = null;
            } else if (expiryDate !== undefined) {
                update.expiryDate = expiryDate ? new Date(expiryDate) : null;
            }

            // Set startDate if provided
            if (startDate !== undefined) {
                update.startDate = startDate ? new Date(startDate) : null;
            }

            // Set link, buttonText, or couponCode based on type
            if (dealType === 'Deal') {
                if (link !== undefined) update.link = link;
                if (buttonText !== undefined) update.buttonText = buttonText;
                update.couponCode = null; // Clear couponCode for Deal
            } else if (dealType === 'Coupon') {
                if (couponCode !== undefined) update.couponCode = couponCode;
                update.link = null; // Clear link for Coupon
                update.buttonText = null; // Clear buttonText for Coupon
            }

            const updated = await Deal.findByIdAndUpdate(id, update, { new: true });
            
            // Format response with expiryText
            const dealObj = updated.toObject();
            dealObj.expiryText = updated.hasExpiry && updated.expiryDate 
                ? new Date(updated.expiryDate).toLocaleDateString() 
                : 'No Expiry';
            
            return res.json({ message: 'Deal updated successfully', status: 200, deal: dealObj });
        } catch (error) {
            console.error('Error updating deal:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },

    deleteDeal: async (req, res) => {
        try {
            const { id } = req.params;
            const deleted = await Deal.findByIdAndDelete(id);
            if (!deleted) {
                return res.status(404).json({ error: 'Deal not found' });
            }
            return res.json({ message: 'Deal deleted successfully', status: 200 });
        } catch (error) {
            console.error('Error deleting deal:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },

    markExpired: async (req, res) => {
        try {
            const { id } = req.params;
            const updated = await Deal.findByIdAndUpdate(id, { isExpired: true, updatedAt: new Date() }, { new: true });
            if (!updated) {
                return res.status(404).json({ error: 'Deal not found' });
            }
            const dealObj = updated.toObject();
            dealObj.expiryText = updated.hasExpiry && updated.expiryDate 
                ? new Date(updated.expiryDate).toLocaleDateString() 
                : 'No Expiry';
            return res.json({ message: 'Deal marked as expired', status: 200, deal: dealObj });
        } catch (error) {
            console.error('Error marking deal expired:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
};

module.exports = dealsController;





