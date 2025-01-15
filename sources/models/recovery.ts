/**
 * @file recovery.ts
 * @description Recovery router models.
 */

'use strict';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

import { queryTransaction } from '@sources/services/database';
import {
    ModelError,
    ModelResponse,
    hashPassword,
} from '@sources/utility/model';
import staticTexts from '@sources/apis/emart/static-texts';

/**
 * Forgot password.
 * @param email Email address.
 * @returns Returns the response object.
 */
async function forgotPassword(email: string) {
    try {
        if (!email)
            throw new ModelError(
                `${staticTexts.invalidParameters}'email'`,
                false,
                400
            );

        if (!/^[a-z0-9](\.?[a-z0-9]){5,}@g(oogle)?mail\.com$/.test(email))
            throw new ModelError(staticTexts.invalidEmail, false, 400);

        await queryTransaction<void>(async (connection) => {
            const [getUserResult] = await connection.execute<RowDataPacket[]>(
                `SELECT * FROM users WHERE email = ?`,
                [email]
            );
            if (!getUserResult.length) return; // Send fake response.

            const [getCredentialResult] = await connection.execute<
                Array<RowDataPacket & { username: string; password: string }>
            >(`SELECT * FROM credentials WHERE BINARY username = ?`, [
                getUserResult[0].username,
            ]);
            if (!getCredentialResult.length)
                throw new ModelError(
                    staticTexts.forgotPasswordError,
                    true,
                    500
                );

            const { username, password } = getCredentialResult[0],
                resetToken = jwt.sign(
                    {
                        username,
                    },
                    password,
                    {
                        expiresIn: '1h',
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
                subject: staticTexts.forgotPasswordEmailSubject,
                html: `<a href="${process.env.NODEMAILER_DOMAIN}/reset-password?token=${resetToken}">${staticTexts.forgotPasswordEmailLinkText}</a>`,
            });
        });

        return new ModelResponse(staticTexts.forgotPasswordSuccess, true, null);
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
 * Reset password.
 * @param token Reset password token.
 * @param newPassword New account password.
 * @returns Returns the response object.
 */
async function resetPassword(token: string, newPassword: string) {
    try {
        if (!token)
            throw new ModelError(
                staticTexts.resetPasswordTokenMissing,
                false,
                400
            );

        if (!newPassword)
            throw new ModelError(
                staticTexts.resetPasswordNewPasswordMissing,
                false,
                400
            );

        if (newPassword.length < 8 || newPassword.length > 32)
            throw new ModelError(staticTexts.invalidPasswordLength, false, 400);

        await queryTransaction<void>(async (connection) => {
            const decoded = jwt.decode(token) as { username: string };
            if (!decoded)
                throw new ModelError(staticTexts.invalidToken, false, 401);

            const [getCredentialResult] = await connection.execute<
                Array<RowDataPacket & { password: string }>
            >(`SELECT password FROM credentials WHERE BINARY username = ?`, [
                decoded.username,
            ]);
            if (!getCredentialResult.length)
                throw new ModelError(staticTexts.resetPasswordError, true, 500);

            if (!jwt.verify(token, getCredentialResult[0].password))
                throw new ModelError(staticTexts.invalidToken, false, 401);

            const hashedPassword = await hashPassword(newPassword);

            const [updateCredentialResult] =
                await connection.execute<ResultSetHeader>(
                    `UPDATE credentials SET password = ? WHERE BINARY username = ?`,
                    [hashedPassword, decoded.username]
                );
            if (!updateCredentialResult.affectedRows)
                throw new ModelError(staticTexts.resetPasswordError, true, 500);
        });

        return new ModelResponse(staticTexts.resetPasswordSuccess, true, null);
    } catch (error) {
        if (
            (error?.message as string)
                .toLowerCase()
                .includes('invalid signature')
        )
            return new ModelResponse(
                staticTexts.invalidRequest,
                false,
                null,
                false,
                401
            );
        if ((error?.message as string).toLowerCase().includes('expired'))
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

export default { forgotPassword, resetPassword };
