/**
 * @file recovery.ts
 * @description Recovery router controller.
 */

'use strict';
import { RequestHandler } from 'express';

import type { TypedResponse } from '@root/global';
import { RawAPIResponse } from '@sources/apis/emart/types';
import * as APITypes from '@sources/apis/emart/types';
import model from '@sources/models/recovery';

/**
 * Recovery router controller.
 */
class RecoveryController {
    // [POST] /recovery/forgot-password
    forgotPassword: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.ForgotPasswordResponseData>
        >,
        next
    ) => {
        const { email } = request.body;

        const resetResult = await model.forgotPassword(email);

        return response
            .status(resetResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.ForgotPasswordResponseData>(
                    resetResult.message,
                    resetResult.success,
                    resetResult.data
                )
            );
    };

    // [POST] /recovery/reset-password
    resetPassword: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.ResetPasswordResponseData>
        >,
        next
    ) => {
        const { token, newPassword } = request.body;

        const resetResult = await model.resetPassword(token, newPassword);

        return response
            .status(resetResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.ResetPasswordResponseData>(
                    resetResult.message,
                    resetResult.success,
                    resetResult.data
                )
            );
    };
}

export default new RecoveryController();
