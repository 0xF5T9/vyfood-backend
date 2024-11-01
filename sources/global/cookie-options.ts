/**
 * @file cookie-options.ts
 * @description Cookie options.
 */

'use strict';
import type { CookieOptions } from 'express';

const cookieOptions: { authToken: CookieOptions } = {
    // Cookie option used for refresh token and access token.
    authToken: {
        httpOnly: true,
        maxAge: 365 * 24 * 60 * 60 * 1000,
        secure: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'none',
        partitioned: process.env.NODE_ENV === 'production' ? false : true,
    },
} as const;

export default cookieOptions;
