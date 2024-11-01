/**
 * @file register.ts
 * @description Register router controller.
 */

'use strict';
import { RequestHandler } from 'express';

import model from '@sources/models/register';

/**
 * Register router controller.
 */
class RegisterController {
    // [POST] /register
    register: RequestHandler = async (request, response, next) => {
        const { username, password, email } = request.body;

        if (!username || !password || !email)
            return response.status(400).json({
                message: `Thông tin 'username', 'password', 'email' bị thiếu.`,
            });

        const inputValidateResult = await model.validateRegisterInput(
            username,
            password,
            email
        );
        if (!inputValidateResult.success)
            return response.status(inputValidateResult.statusCode).json({
                message: inputValidateResult.message,
            });

        const duplicateResult = await model.checkDuplicate(username, email);
        if (!duplicateResult.success)
            return response.status(duplicateResult.statusCode).json({
                message: duplicateResult.message,
            });

        const hashResult = await model.hashPassword(password);
        if (!hashResult.success)
            return response.status(hashResult.statusCode).json({
                message: hashResult.message,
            });

        const registerResult = await model.createAccount(
            username,
            hashResult.data.hashedPassword,
            email
        );
        if (!registerResult.success)
            return response
                .status(registerResult.statusCode)
                .json({ message: registerResult.message });

        return response.status(201).json({
            message: 'Tạo tài khoản thành công.',
        });
    };
}

export default new RegisterController();
