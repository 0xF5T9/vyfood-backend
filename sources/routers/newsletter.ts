/**
 * @file newsletter.ts
 * @description Newsletter router.
 */

'use strict';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

import controller from '@sources/controllers/newsletter';

const router = express.Router();

const newsletterSubscribeLimiter = rateLimit({
        // 3 requests per 3 hours.
        windowMs: 180 * 60 * 1000,
        limit: 3,
        standardHeaders: 'draft-7',
        legacyHeaders: true,
        message: 'Vui lòng thử lại sau.',
        handler: (
            request: Request,
            response: Response,
            next: NextFunction,
            options: any
        ) => {
            return response
                .status(429)
                .json({ message: 'Vui lòng thử lại sau.' });
        },
        keyGenerator: (request: Request, response: Response) =>
            request.body.email,
    }),
    newsletterSubscribeConfirmationLimiter = rateLimit({
        // 4 requests per 3 hours.
        windowMs: 180 * 60 * 1000,
        limit: 4,
        standardHeaders: 'draft-7',
        legacyHeaders: true,
        message: 'Vui lòng thử lại sau.',
        handler: (
            request: Request,
            response: Response,
            next: NextFunction,
            options: any
        ) => {
            return response
                .status(429)
                .json({ message: 'Vui lòng thử lại sau.' });
        },
    });

router.post(
    '/subscribe',
    newsletterSubscribeLimiter,
    controller.subscribeNewsletter
); // Subscrible newsletter.
router.post(
    '/confirm',
    newsletterSubscribeConfirmationLimiter,
    controller.subscribeNewsletterConfirmation
); // Confirm subscribe newsletter request.

export default router;
