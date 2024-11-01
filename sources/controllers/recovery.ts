/**
 * @file recovery.ts
 * @description Recovery router controller.
 */

'use strict';
import { RequestHandler } from 'express';

import model from '@sources/models/recovery';

/**
 * Recovery router controller.
 */
class RecoveryController {
    // [POST] /recovery/forgot-password
    forgotPassword: RequestHandler = async (request, response, next) => {
        const { email } = request.body;

        const resetResult = await model.forgotPassword(email);
        if (!resetResult.success)
            return response
                .status(resetResult.statusCode)
                .json({ message: resetResult.message });

        return response.status(resetResult.statusCode).json({
            message: resetResult.message,
            data: resetResult.data,
        });
    };

    // [POST] /recovery/reset-password
    resetPassword: RequestHandler = async (request, response, next) => {
        const { token, newPassword } = request.body;

        const resetResult = await model.resetPassword(token, newPassword);
        if (!resetResult.success)
            return response
                .status(resetResult.statusCode)
                .json({ message: 'Yêu cầu không hợp lệ.' });

        return response.status(resetResult.statusCode).json({
            message: resetResult.message,
            data: resetResult.data,
        });
    };
}

export default new RecoveryController();
