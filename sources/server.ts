/**
 * @file server.ts
 * @description Start the backend web-server using Express.
 */

'use strict';
require('module-alias/register');
import dotenv from 'dotenv';
dotenv.config({
    path: '.env',
});

import path from 'path';
import express, { ErrorRequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import routers from '@sources/routers';
import { initialize as mysqlInitialize } from '@sources/services/database';
import expressConfig from '@root/configs/express.json';
import corsConfig from '@root/configs/cors.json';
import pathGlobal from '@sources/global/path';

pathGlobal.root = path.join(__dirname, '..');
pathGlobal.upload = path.join(pathGlobal.root, 'upload');
console.log(
    'Loaded paths:',
    '\n• Root: ',
    pathGlobal.root,
    '\n• Upload: ',
    pathGlobal.upload,
    '\n'
);

const app = express();

// If this server is meant to be run behind a reverse proxy (nginx etc),
// set the trust level accordingly so the rate limiter can works correctly.
app.set('trust proxy', 1);

// Global rate limit for all requests.
const globalLimiter = rateLimit({
    // 300 requests per 1 minutes.
    windowMs: 1 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});
app.use(globalLimiter);

// Allow cookies and set origin.
app.use(cors({ credentials: true, origin: corsConfig.origin }));

// Other middlewares.
app.use(express.json());
app.use(
    express.urlencoded({
        extended: true,
    })
);
app.use(cookieParser());

// Initialize routers.
routers(app);

// Initialize mysql.
mysqlInitialize();

// Error-handling middleware.
const errorHandler: ErrorRequestHandler = function (
    error,
    request,
    response,
    next
) {
    console.error(error);
    response.status(500).json({ message: 'Unexpected server error occurred.' });
};
app.use(errorHandler);

// Launch server.
app.listen(expressConfig.port, () => {
    console.log(
        `Loaded environment variables:\n• NODE_ENV: ${process?.env?.NODE_ENV}\n`
    );

    const isProductionMode = process?.env?.NODE_ENV === 'production';
    if (isProductionMode) {
        console.log('Application started in production mode:');
    } else {
        console.log('Application started in development mode:');
    }

    const { networkInterfaces } = require('os');

    const nets = networkInterfaces(),
        results = Object.create(null);

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
            if (net.family === familyV4Value && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }

    console.log(
        `• localhost: http://localhost:${expressConfig.port}\n• IPv4: http://${results?.Ethernet[0]}:${expressConfig.port}\n`
    );

    if (
        process?.env?.NODE_ENV !== 'production' &&
        process?.env?.NODE_ENV !== 'development'
    )
        console.warn(
            `NODE_ENV not set correctly. Expected 'development' or 'production'.`
        );
});
