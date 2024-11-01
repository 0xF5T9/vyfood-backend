/**
 * @file user.ts
 * @description User router.
 */

'use strict';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

import controller from '@sources/controllers/user';
import authorizeModel from '@sources/models/authorize';

const router = express.Router();

const updateUserInfoLimiter = rateLimit({
    // 10 requests per 5 minutes.
    windowMs: 5 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: true,
    message: 'Vui lòng thử lại sau.',
    handler: (
        request: Request,
        response: Response,
        next: NextFunction,
        options: any
    ) => {
        return response.status(429).json({
            message: 'Vui lòng thử lại sau.',
        });
    },
    keyGenerator: (request: Request, response: Response) =>
        request.params.username,
});

// Get users as admin.
router.get(
    '/admin-get-users',
    authorizeModel.authenticateAdmin,
    controller.getUsersAsAdmin
);

// Create an user as admin.
router.post(
    '/admin-create',
    authorizeModel.authenticateAdmin,
    controller.createUserAsAdmin
);

// Update an user as admin.
router.patch(
    '/admin-update',
    authorizeModel.authenticateAdmin,
    controller.updateUserAsAdmin
);

// Delete an user as admin.
router.delete(
    '/admin-delete',
    authorizeModel.authenticateAdmin,
    controller.deleteUserAsAdmin
);

// Upload user avatar as admin.
router.post(
    '/admin-upload-avatar',
    authorizeModel.authenticateAdmin,
    controller.uploadUserAvatarAsAdmin
);

// Upload user avatar.
router.post(
    '/:username/upload-avatar',
    authorizeModel.authenticateUsername,
    controller.uploadUserAvatar
);

// Get user information.
router.get(
    '/:username',
    authorizeModel.authenticateUsername,
    controller.getInfo
);

// Update user information.
router.patch(
    '/:username',
    updateUserInfoLimiter,
    authorizeModel.authenticateUsername,
    controller.updateInfo
);

// Update user email address.
router.post('/update-email-address', controller.updateEmailAddress);

// Update user password.
router.post(
    '/:username/update-password',
    authorizeModel.authenticateUsername,
    controller.updatePassword
);

// Delete user.
router.post(
    '/:username/delete-user',
    authorizeModel.authenticateUsername,
    controller.deleteUser
);

export default router;
