const express = require('express');
const router = express.Router();
const {
    getAllVariantAttributes,
    getActiveVariantAttributes,
    getActiveVariantAttributeNames,
    getVariantAttributeValues,
    getVariantAttributeById,
    updateVariantAttribute,
    updateVariantAttributeValue,
    createVariantAttribute,
    deleteVariantAttribute,
    addValueToAttribute,
    deleteValueFromAttribute,
    addModelToValue,
    deleteModelFromValue,
    updateModelStatus,
    getBrandsWithProductCount
} = require('../controller/variantAttributeController');

// GET all variant attributes
router.get('/get/variant-attributes', getAllVariantAttributes);

// GET active variant attributes (for product creation)
router.get('/get/variant-attributes/active', getActiveVariantAttributes);

// GET only active variant attribute names (without values) - for initial dropdown
router.get('/get/variant-attributes/names', getActiveVariantAttributeNames);

// GET values for a specific variant attribute by ID (lazy loading)
router.get('/get/variant-attribute/:id/values', getVariantAttributeValues);

// GET brands with product counts (for admin products page)
router.get('/get/brands-with-product-count', getBrandsWithProductCount);

// GET single variant attribute by ID
router.get('/get/variant-attribute/:id', getVariantAttributeById);

// POST create new variant attribute
router.post('/create/variant-attribute', createVariantAttribute);

// PUT update variant attribute
router.put('/update/variant-attribute/:id', updateVariantAttribute);

// PUT update variant attribute value status
router.put('/update/variant-attribute-value/:id/:valueSlug', updateVariantAttributeValue);

// DELETE variant attribute
router.delete('/delete/variant-attribute/:id', deleteVariantAttribute);

// POST add value to variant attribute
router.post('/add/variant-attribute-value/:id', addValueToAttribute);

// DELETE value from variant attribute
router.delete('/delete/variant-attribute-value/:id/:valueSlug', deleteValueFromAttribute);

// POST add model to value
router.post('/add/variant-attribute-model/:id/:valueSlug', addModelToValue);

// DELETE model from value
router.delete('/delete/variant-attribute-model/:id/:valueSlug/:modelSlug', deleteModelFromValue);

// PUT update model status
router.put('/update/variant-attribute-model/:id/:valueSlug/:modelSlug', updateModelStatus);

module.exports = router;
