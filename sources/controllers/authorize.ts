/**
 * @file authorize.ts
 * @description Authorize router controller.
 */

'use strict';
import { RequestHandler } from 'express';

import type { TypedResponse } from '@root/global';
import { RawAPIResponse } from '@sources/apis/emart/types';
import * as APITypes from '@sources/apis/emart/types';
import cookieOptions from '@sources/global/cookie-options';

import model from '@sources/models/authorize';
import staticTexts from '@sources/apis/emart/static-texts';

/**
 * Authorize router controller.
 */
class AuthorizeController {
    // [POST] /authorize
    authorize: RequestHandler = async (
        request,
        response: TypedResponse<RawAPIResponse<APITypes.AuthorizeResponseData>>,
        next
    ) => {
        const { username, password } = request.body;

        const authorizeResult = await model.authorize(
            username?.toLowerCase(),
            password
        );
        if (!authorizeResult.success)
            return response
                .status(authorizeResult.statusCode)
                .json(
                    new RawAPIResponse<APITypes.AuthorizeResponseData>(
                        authorizeResult.message,
                        authorizeResult.success,
                        authorizeResult.data
                    )
                );

        response.cookie(
            'refreshToken',
            authorizeResult?.data?.refreshToken,
            cookieOptions.authToken
        );
        response.cookie(
            'accessToken',
            authorizeResult?.data?.accessToken,
            cookieOptions.authToken
        );

        return response
            .status(authorizeResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.AuthorizeResponseData>(
                    authorizeResult.message,
                    authorizeResult.success,
                    authorizeResult.data.user
                )
            );
    };

    // [POST] /deauthorize
    deauthorize: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.DeauthorizeResponseData>
        >,
        next
    ) => {
        response.clearCookie('refreshToken', cookieOptions.authToken);
        response.clearCookie('accessToken', cookieOptions.authToken);

        return response
            .status(200)
            .json(
                new RawAPIResponse<APITypes.DeauthorizeResponseData>(
                    staticTexts.deauthorizeSuccess,
                    true
                )
            );
    };

    // [POST] /authorize/verifySession
    verifySession: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.VerifySessionResponseData>
        >,
        next
    ) => {
        const { refreshToken, accessToken } = request.cookies,
            { forceRefreshToken } = request.query;

        const verifyAccessTokenResult =
            await model.verifyAccessToken(accessToken);
        let result = verifyAccessTokenResult;
        if (!verifyAccessTokenResult.success || forceRefreshToken) {
            if (!verifyAccessTokenResult?.data?.username?.toLowerCase())
                return response
                    .status(verifyAccessTokenResult.statusCode)
                    .json(
                        new RawAPIResponse<APITypes.VerifySessionResponseData>(
                            verifyAccessTokenResult.message,
                            verifyAccessTokenResult.success,
                            verifyAccessTokenResult.data
                        )
                    );

            const refreshTokensResult = await model.refreshTokens(
                refreshToken,
                verifyAccessTokenResult?.data?.username?.toLowerCase()
            );
            if (!refreshTokensResult.success)
                return response
                    .status(refreshTokensResult.statusCode)
                    .json(
                        new RawAPIResponse<APITypes.VerifySessionResponseData>(
                            refreshTokensResult.message,
                            refreshTokensResult.success,
                            refreshTokensResult.data
                        )
                    );
            result = refreshTokensResult;

            response.cookie(
                'refreshToken',
                refreshTokensResult?.data?.refreshToken,
                cookieOptions.authToken
            );
            response.cookie(
                'accessToken',
                refreshTokensResult?.data?.accessToken,
                cookieOptions.authToken
            );
        }

        return response
            .status(result.statusCode)
            .json(
                new RawAPIResponse<APITypes.VerifySessionResponseData>(
                    result.message,
                    result.success,
                    result?.data?.user || result?.data
                )
            );
    };
}

export default new AuthorizeController();
