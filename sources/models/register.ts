/**
 * @file register.ts
 * @description Register router models.
 */

'use strict';
import bcrypt from 'bcrypt';

import { query } from '@sources/services/database';
import { ModelError, ModelResponse } from '@sources/utility/model';

/**
 * Validate the register input.
 * @param username Account username.
 * @param password Account password.
 * @param email Account email.
 * @returns Returns the response object.
 */
async function validateRegisterInput(
    username: string,
    password: string,
    email: string
) {
    try {
        if (!/^[a-z0-9](\.?[a-z0-9]){5,}@g(oogle)?mail\.com$/.test(email))
            throw new ModelError(
                'Địa chỉ email không hợp lệ (Chỉ hỗ trợ Gmail).',
                false,
                400
            );

        if (!/^[a-zA-Z0-9]+$/.test(username))
            throw new ModelError(
                'Tên tài khoản chứa ký tự không hợp lệ [a-zA-Z0-9].',
                false,
                400
            );

        if (username.length < 6 || username.length > 16)
            throw new ModelError(
                'Tên tài khoản phải có tối thiểu 6 ký tự và tối đa 16 ký tự.',
                false,
                400
            );

        if (password.length < 8 || password.length > 32)
            throw new ModelError(
                'Mật khẩu phải có tối thiểu 8 ký tự và tối đa 32 ký tự.',
                false,
                400
            );

        return new ModelResponse('Thành công.', true, null);
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
 * Check if the account information is duplicate.
 * @param username Account username.
 * @param email Account email.
 * @return Returns the response object.
 */
async function checkDuplicate(username: string, email: string) {
    try {
        const usernameSql = `SELECT id FROM users WHERE username = ?`,
            usernameResult: any = await query(usernameSql, [username]);
        if (usernameResult.length)
            throw new ModelError('Tên người dùng này đã tồn tại.', false, 400);

        const emailSql = `SELECT id FROM users WHERE email = ?`,
            emailResult: any = await query(emailSql, [email]);
        if (emailResult.length)
            throw new ModelError('Địa chỉ email này đã tồn tại.', false, 400);

        return new ModelResponse(
            'Tên người dùng và địa chỉ email không bị trùng.',
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
 * Create an account.
 * @param username Account username.
 * @param password Account password.
 * @param email Account email.
 * @returns Returns the response object.
 */
async function createAccount(
    username: string,
    password: string,
    email: string
) {
    let userInsertId;
    try {
        const sqlUser = `INSERT INTO users (username, email) VALUES (?, ?)`,
            userResult: any = await query(sqlUser, [username, email]);
        if (!userResult.affectedRows)
            throw new ModelError(
                'Cập nhật người dùng vào cơ sở dữ liệu thất bại (users).',
                true,
                500
            );
        userInsertId = userResult.insertId;

        const sqlCredentials = `INSERT INTO credentials (password, username) VALUES (?, ?)`,
            credentialsResult: any = await query(sqlCredentials, [
                password,
                username,
            ]);
        if (!credentialsResult.affectedRows)
            throw new ModelError(
                'Cập nhật người dùng vào cơ sở dữ liệu thất bại (credentials).',
                true,
                500
            );

        return new ModelResponse('Tạo tài khoản thành công.', true, null);
    } catch (error) {
        if (userInsertId)
            await query(`DELETE FROM users WHERE id = ${userInsertId}`);
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
    validateRegisterInput,
    checkDuplicate,
    hashPassword,
    createAccount,
};
