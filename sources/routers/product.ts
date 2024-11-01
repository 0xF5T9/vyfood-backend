/**
 * @file product.ts
 * @description Product router.
 */

'use strict';
import express from 'express';

import authorizeModel from '@sources/models/authorize';
import controller from '@sources/controllers/product';

const router = express.Router();

router.get('/', controller.getProducts); // Get products.
router.post('/', authorizeModel.authenticateAdmin, controller.createProduct); // Create product.
router.put('/', authorizeModel.authenticateAdmin, controller.updateProduct); // Update product.
router.delete('/', authorizeModel.authenticateAdmin, controller.deleteProduct); // Delete product.
router.post(
    '/image',
    authorizeModel.authenticateAdmin,
    controller.updateProductImage
); // Update product image.

export default router;
