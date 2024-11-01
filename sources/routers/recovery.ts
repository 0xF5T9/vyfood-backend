/**
 * @file recovery.ts
 * @description Recovery router.
 */

'use strict';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

import controller from '@sources/controllers/recovery';

const router = express.Router();

const forgotPasswordLimiter = rateLimit({
    // 1 requests per 3 hours.
    windowMs: 180 * 60 * 1000,
    limit: 1,
    standardHeaders: 'draft-7',
    legacyHeaders: true,
    message: 'Vui lòng thử lại sau.',
    handler: (
        request: Request,
        response: Response,
        next: NextFunction,
        options: any
    ) => {
        return response.status(429).json({ message: 'Vui lòng thử lại sau.' });
    },
    keyGenerator: (request: Request, response: Response) => request.body.email,
});

router.post(
    '/forgot-password',
    forgotPasswordLimiter,
    controller.forgotPassword
);
router.post('/reset-password', controller.resetPassword);

export default router;
