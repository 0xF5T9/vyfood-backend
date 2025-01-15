/**
 * @file register.ts
 * @description Register router controller.
 */

'use strict';
import { RequestHandler } from 'express';

import type { TypedResponse } from '@root/global';
import { RawAPIResponse } from '@sources/apis/emart/types';
import * as APITypes from '@sources/apis/emart/types';
import model from '@sources/models/register';

/**
 * Register router controller.
 */
class RegisterController {
    // [POST] /register
    register: RequestHandler = async (
        request,
        response: TypedResponse<RawAPIResponse<APITypes.RegisterResponseData>>,
        next
    ) => {
        const { username, password, email } = request.body;

        const createAccountResult = await model.createAccount(
            username?.toLowerCase(),
            password,
            email
        );

        return response
            .status(createAccountResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.RegisterResponseData>(
                    createAccountResult.message,
                    createAccountResult.success,
                    createAccountResult.data
                )
            );
    };
}

export default new RegisterController();
