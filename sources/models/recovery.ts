/**
 * @file recovery.ts
 * @description Recovery router models.
 */

'use strict';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { query } from '@sources/services/database';
import { ModelError, ModelResponse } from '@sources/utility/model';
import nodemailerConfig from '@root/configs/nodemailer.json';

/**
 * Hash password using bcrypt.
 * @param password Password string.
 * @param saltRounds Salt rounds. (default: 10)
 * @returns Returns the response object.
 */
async function hashPassword(password: string, saltRounds: number = 10) {
    try {
        const salt = await bcrypt.genSalt(saltRounds),
            hashedPassword = await bcrypt.hash(password, salt);

        return new ModelResponse('Băm mật khẩu thành công.', true, {
            generatedSalt: salt,
            hashedPassword,
        });
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

        const userResult: any = await query(
            `SELECT * FROM users WHERE email = ?`,
            [email]
        );
        if (!!!userResult.length)
            return new ModelResponse(
                'Kiểm tra email của bạn để đặt lại mật khẩu.',
                true,
                null
            );

        const credentialResult: any = await query(
            `SELECT * FROM credentials WHERE username = ?`,
            [userResult[0].username]
        );
        if (!!!credentialResult.length)
            throw new ModelError(
                'Không thể truy xuất thông tin đăng nhập người dùng.',
                true,
                500
            );

        const { username, password } = credentialResult[0],
            resetToken = jwt.sign(
                {
                    username,
                },
                password,
                {
                    expiresIn: '1h',
                }
            );

        const transporter = nodemailer.createTransport(
            nodemailerConfig.transporterOptions
        );

        await transporter.sendMail({
            from: nodemailerConfig.resetPasswordSendMailOptions.from,
            to: email,
            subject: nodemailerConfig.resetPasswordSendMailOptions.subject,
            html: `<a href="${nodemailerConfig.resetPasswordSendMailOptions.domain}/reset-password?token=${resetToken}">Nhấn vào liên kết này để khôi phục tài khoản của bạn</a>`,
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

        const decoded: any = jwt.decode(token);
        if (!decoded) throw new ModelError('Token không hợp lệ.', false, 401);

        const credentialResult: any = await query(
            `SELECT * FROM credentials WHERE username = ?`,
            [decoded.username]
        );
        if (!!!credentialResult.length)
            throw new ModelError(
                'Không thể truy xuất thông tin đăng nhập người dùng.',
                true,
                500
            );

        if (!jwt.verify(token, credentialResult[0].password))
            throw new ModelError('Token không hợp lệ.', false, 401);

        const hashResult = await hashPassword(newPassword);
        if (!hashResult.success)
            throw new ModelError(hashResult.message, true, 500);

        const updateResult: any = await query(
            `UPDATE credentials SET password = ? WHERE username = ?`,
            [hashResult.data.hashedPassword, decoded.username]
        );
        if (!updateResult.affectedRows)
            throw new ModelError('Cập nhật mật khẩu thất bại.', true, 500);

        return new ModelResponse('Cập nhật mật khẩu thành công.', true, null);
    } catch (error) {
        if (
            (error?.message as string)
                .toLowerCase()
                .includes('invalid signature')
        )
            return new ModelResponse(
                'Token không hợp lệ.',
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
