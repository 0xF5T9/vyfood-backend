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

// Validate environment variables.
const environmentVariables = {
    NODE_ENV: process.env.NODE_ENV,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    NODEMAILER_USER: process.env.NODEMAILER_USER,
    NODEMAILER_APP_PASSWORD: process.env.NODEMAILER_APP_PASSWORD,
    NODEMAILER_DOMAIN: process.env.NODEMAILER_DOMAIN,
    DATABASE_HOST: process.env.DATABASE_HOST,
    DATABASE_USER: process.env.DATABASE_USER,
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
    DATABASE_NAME: process.env.DATABASE_NAME,
    PORT: process.env.PORT,
};
let isConfigurationInvalid = false;
for (const variable in environmentVariables) {
    let value =
        environmentVariables[variable as keyof typeof environmentVariables];
    if (!value) {
        console.error(` ENV Variable '${variable}' is undefined.`);
        isConfigurationInvalid = true;
    }
    if (
        variable === 'NODE_ENV' &&
        value !== 'development' &&
        value !== 'production'
    ) {
        console.error(
            `NODE_ENV not set correctly. Expected 'development' or 'production'.`
        );
        isConfigurationInvalid = true;
    }
}
if (isConfigurationInvalid)
    throw new Error(
        `Misconfiguration detected. Please check if the environment variables are set correctly.`
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
app.use(
    cors({
        credentials: true,
        origin: environmentVariables.CORS_ORIGIN.split(' '),
    })
);

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
app.listen(environmentVariables.PORT, () => {
    let environmentVariablesLog = 'Loaded environment variables:\n';
    for (const variable in environmentVariables) {
        environmentVariablesLog += `• ${variable}: ${environmentVariables[variable as keyof typeof environmentVariables]}\n`;
    }
    console.log(environmentVariablesLog);
    const isProductionMode = process?.env?.NODE_ENV === 'production';
    console.log(
        `Application started in ${isProductionMode ? 'production' : 'development'} mode at port ${environmentVariables.PORT}.`
    );
});
