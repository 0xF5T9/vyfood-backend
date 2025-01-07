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

/**
 * Forgot password.
 * @param email Email address.
 * @returns Returns the response object.
 */
async function forgotPassword(email: string) {
    try {
        if (!email)
            throw new ModelError(
                'Không có địa chỉ email nào được cung cấp.',
                false,
                400
            );

        if (!/^[a-z0-9](\.?[a-z0-9]){5,}@g(oogle)?mail\.com$/.test(email))
            throw new ModelError(
                'Địa chỉ email không hợp lệ (Chỉ hỗ trợ Gmail).',
                false,
                400
            );

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
                    'Không thể truy xuất thông tin đăng nhập người dùng.',
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
                subject: 'Update Email Address',
                html: `<a href="${process.env.NODEMAILER_DOMAIN}/reset-password?token=${resetToken}">Nhấn vào liên kết này để khôi phục tài khoản của bạn</a>`,
            });
        });

        return new ModelResponse(
            'Kiểm tra email của bạn để đặt lại mật khẩu.',
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
 * Reset password.
 * @param token Reset password token.
 * @param newPassword New account password.
 * @returns Returns the response object.
 */
async function resetPassword(token: string, newPassword: string) {
    try {
        if (!token)
            throw new ModelError(
                'Không có token khôi phục nào được cung cấp.',
                false,
                400
            );

        if (!newPassword)
            throw new ModelError(
                'Không có mật khẩu mới nào được cung cấp.',
                false,
                400
            );

        if (newPassword.length < 8 || newPassword.length > 32)
            throw new ModelError(
                'Mật khẩu phải có tối thiểu 8 ký tự và tối đa 32 ký tự.',
                false,
                400
            );

        await queryTransaction<void>(async (connection) => {
            const decoded = jwt.decode(token) as { username: string };
            if (!decoded)
                throw new ModelError('Token không hợp lệ.', false, 401);

            const [getCredentialResult] = await connection.execute<
                Array<RowDataPacket & { password: string }>
            >(`SELECT password FROM credentials WHERE BINARY username = ?`, [
                decoded.username,
            ]);
            if (!getCredentialResult.length)
                throw new ModelError(
                    'Không thể truy xuất thông tin đăng nhập người dùng.',
                    true,
                    500
                );

            if (!jwt.verify(token, getCredentialResult[0].password))
                throw new ModelError('Token không hợp lệ.', false, 401);

            const hashedPassword = await hashPassword(newPassword);

            const [updateCredentialResult] =
                await connection.execute<ResultSetHeader>(
                    `UPDATE credentials SET password = ? WHERE BINARY username = ?`,
                    [hashedPassword, decoded.username]
                );
            if (!updateCredentialResult.affectedRows)
                throw new ModelError('Cập nhật mật khẩu thất bại.', true, 500);
        });

        return new ModelResponse('Cập nhật mật khẩu thành công.', true, null);
    } catch (error) {
        if (
            (error?.message as string)
                .toLowerCase()
                .includes('invalid signature')
        )
            return new ModelResponse(
                'Yêu cầu khôi phục này không hợp lệ.',
                false,
                null,
                false,
                401
            );
        if ((error?.message as string).toLowerCase().includes('expired'))
            return new ModelResponse(
                'Yêu cầu khôi phục này đã hết hạn.',
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

export default { forgotPassword, resetPassword };
