/**
 * @file newsletter.ts
 * @description Newsletter router models.
 */

'use strict';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

import jwtConfig from '@root/configs/jwt.json';
import { queryTransaction } from '@sources/services/database';
import {
    ModelError,
    ModelResponse,
    validateEmail,
} from '@sources/utility/model';
import staticTexts from '@sources/apis/emart/static-texts';

/**
 * Send a subscrible newsletter confirmation mail.
 * @param email The email.
 * @returns Returns the response object.
 */
async function subscribeNewsletter(email: string) {
    try {
        if (!email)
            throw new ModelError(
                `${staticTexts.invalidParameters}'email'`,
                false,
                400
            );

        await queryTransaction<void>(async (connection) => {
            await validateEmail(connection, email, false);

            const [isSubscribedResult] = await connection.execute<
                Array<RowDataPacket & { count: number }>
            >(
                'SELECT COUNT(*) as count FROM newsletter_subscribers WHERE email = ?',
                [email]
            );
            if (isSubscribedResult[0].count) return;

            const newsletterToken = jwt.sign(
                { email },
                process.env.NEWSLETTER_VALIDATION_TOKEN_SECRET_KEY,
                {
                    expiresIn: jwtConfig.jwtNewsletterTokenDuration,
                }
            );

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                host: 'smtp.google.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.NODEMAILER_USER,
                    pass: process.env.NODEMAILER_APP_PASSWORD,
                },
            });

            await transporter.sendMail({
                from: `no-reply <${process.env.NODEMAILER_USER}>`,
                to: email,
                subject: staticTexts.subscribeNewsletterEmailSubject,
                html: `<a href="${process.env.NODEMAILER_DOMAIN}/newsletter-subscribe?token=${newsletterToken}">${staticTexts.subscribeNewsletterEmailLinkText}</a>`,
            });
        });

        return new ModelResponse(
            staticTexts.subscribeNewsletterSuccess,
            true,
            null
        );
    } catch (error) {
        console.error(error);
        if (error.isServerError === undefined) error.isServerError = true;

        return new ModelResponse(
            error.isServerError === false
                ? error.message
                : staticTexts.unknownError,
            false,
            null,
            error.isServerError,
            error.statusCode
        );
    }
}

/**
 * Confirm a newsletter subscribe request.
 * @param newsletterToken The subscribe newsletter token.
 * @returns Returns the response object.
 */
async function subscribeNewsletterConfirmation(newsletterToken: string) {
    try {
        if (!newsletterToken)
            throw new ModelError(
                `${staticTexts.invalidParameters}'newsletterToken'`,
                false,
                400
            );

        await queryTransaction<void>(async (connection) => {
            const verifyTokenResult = jwt.verify(
                    newsletterToken,
                    process.env.NEWSLETTER_VALIDATION_TOKEN_SECRET_KEY
                ) as jwt.JwtPayload & { email: string },
                { email } = verifyTokenResult;

            await validateEmail(connection, email, false);

            const [isSubscribedResult] = await connection.execute<
                Array<RowDataPacket & { count: number }>
            >(
                'SELECT COUNT(*) as count FROM newsletter_subscribers WHERE email = ?',
                [email]
            );
            if (isSubscribedResult[0].count) return;

            const [insertSubscriberResult] =
                await connection.execute<ResultSetHeader>(
                    'INSERT INTO newsletter_subscribers (email) VALUES (?)',
                    [email]
                );
            if (!insertSubscriberResult.affectedRows)
                throw new ModelError(
                    staticTexts.subscribeNewsletterConfirmationError,
                    true,
                    500
                );
        });

        return new ModelResponse(
            staticTexts.subscribeNewsletterConfirmationSuccess,
            true,
            null
        );
    } catch (error) {
        if (error.name === 'JsonWebTokenError')
            return new ModelResponse(
                staticTexts.invalidRequest,
                false,
                null,
                false,
                401
            );
        else if (error.name === 'TokenExpiredError')
            return new ModelResponse(
                staticTexts.expiredRequest,
                false,
                null,
                false,
                401
            );

        console.error(error);
        if (error.isServerError === undefined) error.isServerError = true;

        return new ModelResponse(
            error.isServerError === false
                ? error.message
                : staticTexts.unknownError,
            false,
            null,
            error.isServerError,
            error.statusCode
        );
    }
}

export default {
    subscribeNewsletter,
    subscribeNewsletterConfirmation,
};
