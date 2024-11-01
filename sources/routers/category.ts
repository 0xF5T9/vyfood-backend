/**
 * @file category.ts
 * @description Category router.
 */

'use strict';
import express from 'express';

import authorizeModel from '@sources/models/authorize';
import controller from '@sources/controllers/category';

const router = express.Router();

router.get('/', controller.getCategories); // Get categories.
router.get('/categoriesCount', controller.getCategoriesCount); // Get product counts from categories.
router.post('/', authorizeModel.authenticateAdmin, controller.createCategory); // Create category.
router.put('/', authorizeModel.authenticateAdmin, controller.updateCategory); // Update category.
router.delete('/', authorizeModel.authenticateAdmin, controller.deleteCategory); // Delete category.
router.post(
    '/image',
    authorizeModel.authenticateAdmin,
    controller.updateCategoryImage
); // Update category image.

export default router;
