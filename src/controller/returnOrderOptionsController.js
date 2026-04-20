// controller/returnOrderOptionsController.js
const ReturnOrderOptions = require("../models/returnOrderOptions");

const returnOrderOptionsController = {
    // Get all options (optionally filter by type)
    getAllOptions: async (req, res) => {
        try {
            const { type } = req.query;
            const filter = type ? { type, isPublish: true } : { isPublish: true };
            const options = await ReturnOrderOptions.find(filter).sort({ name: 1 });
            return res.json({ options, status: 200, message: "Options fetched successfully" });
        } catch (error) {
            console.error('Error fetching return order options:', error);
            return res.json({ error: 'Failed to fetch options', status: 500 });
        }
    },

    // Get options by type
    getOptionsByType: async (req, res) => {
        try {
            const { type } = req.params;
            const validTypes = ['account', 'platform', 'status', 'customerAsks'];

            if (!validTypes.includes(type)) {
                return res.json({ error: 'Invalid option type', status: 400 });
            }

            const options = await ReturnOrderOptions.find({ type, isPublish: true }).sort({ name: 1 });
            return res.json({ options, status: 200, message: `${type} options fetched successfully` });
        } catch (error) {
            console.error(`Error fetching ${req.params.type} options:`, error);
            return res.json({ error: 'Failed to fetch options', status: 500 });
        }
    },

    // Get all options grouped by type
    getAllOptionsGrouped: async (req, res) => {
        try {
            const options = await ReturnOrderOptions.find({ isPublish: true }).sort({ name: 1 });

            const grouped = {
                account: options.filter(o => o.type === 'account'),
                platform: options.filter(o => o.type === 'platform'),
                status: options.filter(o => o.type === 'status'),
                customerAsks: options.filter(o => o.type === 'customerAsks')
            };

            return res.json({ options: grouped, status: 200, message: "Options fetched successfully" });
        } catch (error) {
            console.error('Error fetching grouped options:', error);
            return res.json({ error: 'Failed to fetch options', status: 500 });
        }
    },

    // Create new option
    createOption: async (req, res) => {
        try {
            const { name, type, isPublish = true } = req.body;

            if (!name || !type) {
                return res.json({ error: 'Name and type are required', status: 400 });
            }

            const validTypes = ['account', 'platform', 'status', 'customerAsks'];
            if (!validTypes.includes(type)) {
                return res.json({ error: 'Invalid option type', status: 400 });
            }

            // Check if option already exists
            const existingOption = await ReturnOrderOptions.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                type
            });

            if (existingOption) {
                return res.json({
                    option: existingOption,
                    status: 200,
                    message: "Option already exists"
                });
            }

            const newOption = new ReturnOrderOptions({
                name,
                type,
                isPublish,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const savedOption = await newOption.save();
            return res.json({
                option: savedOption,
                status: 201,
                message: "Option created successfully"
            });
        } catch (error) {
            console.error('Error creating return order option:', error);
            if (error.code === 11000) {
                return res.json({ error: 'Option already exists', status: 400 });
            }
            return res.json({ error: 'Failed to create option', status: 500 });
        }
    },

    // Update option
    updateOption: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, isPublish } = req.body;

            const option = await ReturnOrderOptions.findById(id);
            if (!option) {
                return res.json({ error: 'Option not found', status: 404 });
            }

            if (name) option.name = name;
            if (typeof isPublish === 'boolean') option.isPublish = isPublish;
            option.updatedAt = new Date();

            const updatedOption = await option.save();
            return res.json({
                option: updatedOption,
                status: 200,
                message: "Option updated successfully"
            });
        } catch (error) {
            console.error('Error updating return order option:', error);
            return res.json({ error: 'Failed to update option', status: 500 });
        }
    },

    // Toggle publish status
    togglePublish: async (req, res) => {
        try {
            const { id } = req.params;
            const { isPublish } = req.body;

            const updatedOption = await ReturnOrderOptions.findByIdAndUpdate(
                id,
                { isPublish, updatedAt: new Date() },
                { new: true }
            );

            if (!updatedOption) {
                return res.json({ error: 'Option not found', status: 404 });
            }

            return res.json({
                option: updatedOption,
                status: 200,
                message: `Option ${isPublish ? 'published' : 'unpublished'} successfully`
            });
        } catch (error) {
            console.error('Error toggling publish status:', error);
            return res.json({ error: 'Failed to toggle publish status', status: 500 });
        }
    },

    // Delete option
    deleteOption: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedOption = await ReturnOrderOptions.findByIdAndDelete(id);

            if (!deletedOption) {
                return res.json({ error: 'Option not found', status: 404 });
            }

            return res.json({ status: 200, message: "Option deleted successfully" });
        } catch (error) {
            console.error('Error deleting return order option:', error);
            return res.json({ error: 'Failed to delete option', status: 500 });
        }
    },

    // Seed default options (for initial setup)
    seedDefaultOptions: async (req, res) => {
        try {
            const defaultOptions = [
                // Account options
                { name: 'Zextons', type: 'account' },
                { name: 'iUltra', type: 'account' },
                { name: 'Trezlon', type: 'account' },

                // Platform options
                { name: 'eBay', type: 'platform' },
                { name: 'Backmarket', type: 'platform' },
                { name: 'Amazon', type: 'platform' },
                { name: 'Website', type: 'platform' },
                { name: 'TikTok', type: 'platform' },
                { name: 'OwnBy', type: 'platform' },
                { name: 'Other', type: 'platform' },

                // Status options
                { name: 'Pending', type: 'status' },
                { name: 'Return Sent', type: 'status' },
                { name: 'Sent For Repair', type: 'status' },
                { name: 'Refunded', type: 'status' },
                { name: 'Replaced', type: 'status' },
                { name: 'Waiting for Customer', type: 'status' },
                { name: 'File Claim', type: 'status' },
                { name: 'Claim Filed', type: 'status' },
                { name: 'Claim Approved', type: 'status' },
                { name: 'Claim Rejected', type: 'status' },
                { name: 'Out of Warranty', type: 'status' },
                { name: 'Waiting for Delivery', type: 'status' },

                // Customer Asks options
                { name: 'Replacement', type: 'customerAsks' },
                { name: 'Repair', type: 'customerAsks' },
                { name: 'Refund', type: 'customerAsks' },
                { name: 'Refused', type: 'customerAsks' },
                { name: 'Items Not Received', type: 'customerAsks' },
                { name: 'Payment Dispute', type: 'customerAsks' },
            ];

            let created = 0;
            let skipped = 0;

            for (const option of defaultOptions) {
                const exists = await ReturnOrderOptions.findOne({
                    name: option.name,
                    type: option.type
                });

                if (!exists) {
                    await ReturnOrderOptions.create({
                        ...option,
                        isPublish: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    created++;
                } else {
                    skipped++;
                }
            }

            return res.json({
                status: 200,
                message: `Seeding complete. Created: ${created}, Skipped (already exists): ${skipped}`
            });
        } catch (error) {
            console.error('Error seeding default options:', error);
            return res.json({ error: 'Failed to seed default options', status: 500 });
        }
    }
};

module.exports = returnOrderOptionsController;
