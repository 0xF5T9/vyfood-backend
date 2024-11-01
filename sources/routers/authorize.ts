/**
 * @file authorize.ts
 * @description Authorize router.
 */

'use strict';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

import controller from '@sources/controllers/authorize';

const router = express.Router();

const authorizeLimiter = rateLimit({
    // 10 requests per 1 minutes.
    windowMs: 1 * 60 * 1000,
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
        return response.status(429).json({ message: 'Vui lòng thử lại sau.' });
    },
});

// Authorize using username and password.
router.post('/', authorizeLimiter, controller.authorize);

// Deauthorize.
router.post('/deauthorize', authorizeLimiter, controller.deauthorize);

// Verify the user session.
router.post('/verifySession', controller.verifySession);

export default router;
