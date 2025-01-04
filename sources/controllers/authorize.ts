/**
 * @file authorize.ts
 * @description Authorize router controller.
 */

'use strict';
import { RequestHandler } from 'express';
import cookieOptions from '@sources/global/cookie-options';

import model from '@sources/models/authorize';

/**
 * Authorize router controller.
 */
class AuthorizeController {
    // [POST] /authorize
    authorize: RequestHandler = async (request, response, next) => {
        const { username, password } = request.body;

        const authorizeResult = await model.authorize(
            username?.toLowerCase(),
            password
        );
        if (!authorizeResult.success)
            return response
                .status(authorizeResult.statusCode)
                .json({ message: authorizeResult.message });

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

        return response.status(authorizeResult.statusCode).json({
            message: authorizeResult.message,
            data: authorizeResult.data.user,
        });
    };

    // [POST] /deauthorize
    deauthorize: RequestHandler = async (request, response, next) => {
        response.clearCookie('refreshToken', cookieOptions.authToken);
        response.clearCookie('accessToken', cookieOptions.authToken);

        return response.status(200).json({
            message: 'Đăng xuất thành công.',
        });
    };

    // [POST] /authorize/verifySession
    verifySession: RequestHandler = async (request, response, next) => {
        const { refreshToken, accessToken } = request.cookies,
            { forceRefreshToken } = request.query;

        const verifyAccessTokenResult =
            await model.verifyAccessToken(accessToken);
        let result = verifyAccessTokenResult;
        if (!verifyAccessTokenResult.success || forceRefreshToken) {
            if (!verifyAccessTokenResult?.data?.username?.toLowerCase())
                return response
                    .status(verifyAccessTokenResult.statusCode)
                    .json({ message: verifyAccessTokenResult.message });

            const refreshTokensResult = await model.refreshTokens(
                refreshToken,
                verifyAccessTokenResult?.data?.username?.toLowerCase()
            );
            if (!refreshTokensResult.success)
                return response
                    .status(refreshTokensResult.statusCode)
                    .json({ message: refreshTokensResult.message });
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

        return response.status(result.statusCode).json({
            message: result.message,
            data: result?.data?.user || result?.data,
        });
    };
}

export default new AuthorizeController();
