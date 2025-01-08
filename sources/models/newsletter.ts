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

/**
 * Send a subscrible newsletter confirmation mail.
 * @param email The email.
 * @returns Returns the response object.
 */
async function subscribeNewsletter(email: string) {
    try {
        if (!email)
            throw new ModelError(`Thông tin 'email' bị thiếu.`, false, 400);

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
                subject: 'Subscrible Newsletter Confirmation',
                html: `<a href="${process.env.NODEMAILER_DOMAIN}/newsletter-subscribe?token=${newsletterToken}">Nhấn vào liên kết này để xác nhận yêu cầu nhận tin</a>`,
            });
        });

        return new ModelResponse(
            'Kiểm tra email của bạn để xác nhận yêu cầu nhé.',
            true,
            null
        );
    } catch (error) {
        console.error(error);
        if (error.isServerError === undefined) error.isServerError = true;

        return new ModelResponse(
            error.isServerError === false ? error.message : 'Có lỗi xảy ra.',
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
                `Thông tin 'newsletterToken' bị thiếu.`,
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
                    'Có lỗi xảy ra khi thêm dữ liệu. (newsletter_subscribers)',
                    true,
                    500
                );
        });

        return new ModelResponse(
            'Bạn đã đăng ký nhận bản tin thành công.',
            true,
            null
        );
    } catch (error) {
        if (error.name === 'JsonWebTokenError')
            return new ModelResponse(
                'Yêu cầu xác nhận này không hợp lệ.',
                false,
                null,
                false,
                401
            );
        else if (error.name === 'TokenExpiredError')
            return new ModelResponse(
                'Yêu cầu xác nhận này đã hết hạn.',
                false,
                null,
                false,
                401
            );

        console.error(error);
        if (error.isServerError === undefined) error.isServerError = true;

        return new ModelResponse(
            error.isServerError === false ? error.message : 'Có lỗi xảy ra.',
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
