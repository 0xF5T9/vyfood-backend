/**
 * @file order.ts
 * @description Order router.
 */

'use strict';
import express from 'express';

import authorizeModel from '@sources/models/authorize';
import controller from '@sources/controllers/order';

const router = express.Router();

router.get('/', authorizeModel.authenticateAdmin, controller.getOrders); // Get orders.
router.post('/', controller.createOrder); // Create order.
router.patch('/', authorizeModel.authenticateAdmin, controller.updateOrder); // Update order.
router.delete('/', authorizeModel.authenticateAdmin, controller.deleteOrder); // Delete order.
router.post(
    '/restore-product-quantity',
    authorizeModel.authenticateAdmin,
    controller.restoreProductQuantity
); // Restore order product quantity.

export default router;
