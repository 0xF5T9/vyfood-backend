/**
 * @file register.ts
 * @description Register router models.
 */

'use strict';
import type { ResultSetHeader } from 'mysql2/promise';

import { queryTransaction } from '@sources/services/database';
import {
    ModelError,
    ModelResponse,
    validateUsername,
    validatePassword,
    validateEmail,
    hashPassword,
} from '@sources/utility/model';

/**
 * Create an account.
 * @param username Username.
 * @param password Password.
 * @param email Email.
 * @returns Returns the response object.
 */
async function createAccount(
    username: string,
    password: string,
    email: string
) {
    try {
        if (!username || !password || !email)
            throw new ModelError(
                `Thông tin 'username', 'password', 'email' bị thiếu.`,
                false,
                400
            );

        await queryTransaction<void>(async (connection) => {
            if (
                !(await validateUsername(connection, username, true)) ||
                !validatePassword(password) ||
                !(await validateEmail(connection, email, true))
            )
                throw new ModelError(
                    'Thông tin đăng ký không hợp lệ.',
                    false,
                    400
                );

            const hashedPassword = await hashPassword(password);

            const [insertUserResult] =
                await connection.execute<ResultSetHeader>(
                    'INSERT INTO users (username, email) VALUES (?, ?)',
                    [username, email]
                );
            if (!insertUserResult.affectedRows)
                throw new ModelError(
                    'Cập nhật người dùng vào cơ sở dữ liệu thất bại (users).',
                    true,
                    500
                );

            const [insertCredentialResult] =
                await connection.execute<ResultSetHeader>(
                    'INSERT INTO credentials (password, username) VALUES (?, ?)',
                    [hashedPassword, username]
                );
            if (!insertCredentialResult.affectedRows)
                throw new ModelError(
                    'Cập nhật người dùng vào cơ sở dữ liệu thất bại (credentials).',
                    true,
                    500
                );
        });

        return new ModelResponse('Tạo tài khoản thành công.', true, null);
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

export default {
    createAccount,
};
