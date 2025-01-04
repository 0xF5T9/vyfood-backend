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

        const createAccountResult = await model.createAccount(
            username?.toLowerCase(),
            password,
            email
        );
        if (!createAccountResult.success)
            return response.status(createAccountResult.statusCode).json({
                message: createAccountResult.message,
            });

        return response.status(201).json({
            message: createAccountResult.message,
        });
    };
}

export default new RegisterController();
