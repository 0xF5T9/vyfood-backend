/**
 * @file test.ts
 * @description Test router models.
 */

'use strict';
import nodemailer from 'nodemailer';

import { query } from '@sources/services/database';
import { ModelError, ModelResponse } from '@sources/utility/model';

/**
 * Send email using nodemailer.
 * @param transporterOptions Nodemailer transporter options.
 * @param mailOptions Nodemailer mail options.
 * @returns Returns the response object.
 */
async function sendMail(
    transporterOptions: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        password: string;
        service?: string;
    },
    mailOptions: {
        from: string;
        to: string;
        subject: string;
        html: string;
    }
) {
    try {
        const transporter = nodemailer.createTransport({
            service: transporterOptions.service,
            host: transporterOptions.host,
            port: transporterOptions.port,
            secure: transporterOptions.secure,
            auth: {
                user: transporterOptions.user,
                pass: transporterOptions.password,
            },
            // tls: { servername: `${transporterOptions.host}`, rejectUnauthorized: false },
            // ignoreTLS: true,
        });

        const sendMailResult = await transporter.sendMail({
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject,
            html: mailOptions.html,
        });

        return new ModelResponse('Thành công.', true, sendMailResult);
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

export default { sendMail };
