/**
 * @file authorize.ts
 * @description Authorize router models.
 */

'use strict';
import type { RowDataPacket } from 'mysql2/promise';
import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { query } from '@sources/services/database';
import { ModelError, ModelResponse } from '@sources/utility/model';
import cookieOptions from '@sources/global/cookie-options';
import jwtConfig from '@root/configs/jwt.json';
import type { TypedResponse } from '@root/global';
import { RawAPIResponse } from '@sources/apis/emart/types';
import staticTexts from '@sources/apis/emart/static-texts';

/**
 * Authorize using username and password.
 * @param username Username.
 * @param password Password.
 * @returns Returns ready to use refresh token, access token and user identification data.
 */
async function authorize(username: string, password: string) {
    try {
        if (!username || !password)
            throw new ModelError(
                `${staticTexts.invalidParameters}'username', 'password'`,
                false,
                400
            );

        const userInformation = await query<RowDataPacket[]>(
            `SELECT c.username, c.password, u.email, u.role, u.avatarFileName
                                                FROM credentials c JOIN users u 
                                                ON c.username = u.username 
                                                WHERE c.username = ?`,
            [username]
        );
        if (!userInformation.length)
            throw new ModelError(
                staticTexts.invalidUsernameOrPassword,
                false,
                401
            );

        const compareResult = await bcrypt.compare(
            password,
            userInformation[0].password
        );
        if (!compareResult)
            throw new ModelError(
                staticTexts.invalidUsernameOrPassword,
                false,
                401
            );

        const refreshToken = jwt.sign({}, userInformation[0].password, {
                expiresIn: jwtConfig.jwtRefreshTokenDuration,
            }),
            accessToken = jwt.sign(
                {
                    username: userInformation[0].username,
                    email: userInformation[0].email,
                    role: userInformation[0].role,
                    avatarFileName: userInformation[0].avatarFileName,
                },
                userInformation[0].password,
                { expiresIn: jwtConfig.jwtAccessTokenDuration }
            );

        return new ModelResponse(staticTexts.authorizeSuccess, true, {
            refreshToken,
            accessToken,
            user: {
                username: userInformation[0].username,
                email: userInformation[0].email,
                role: userInformation[0].role,
                avatarFileName: userInformation[0].avatarFileName,
            },
        });
    } catch (error) {
        console.error(error);
        if (error.isServerError === undefined) error.isServerError = true;

        return new ModelResponse(
            error.isServerError === false
                ? error.message
                : staticTexts.unknownError,
            false,
            null,
            error.isServerError,
            error.statusCode
        );
    }
}

/**
 * Get new refresh token, access token, user identification data using a valid refresh token.
 * @param refreshToken Refresh token.
 * @param username Username.
 * @returns Returns ready to use refresh token, access token and user identification data.
 */
async function refreshTokens(refreshToken: string, username: string) {
    try {
        if (!refreshToken || !username)
            throw new ModelError(
                `${staticTexts.invalidParameters}'refreshToken', 'username'`,
                false,
                400
            );

        const userInformation = await query<RowDataPacket[]>(
            `SELECT c.username, c.password, u.email, u.role, u.avatarFileName
                                                    FROM credentials c JOIN users u 
                                                    ON c.username = u.username 
                                                    WHERE c.username = ?`,
            [username]
        );
        if (!userInformation.length)
            throw new ModelError(staticTexts.invalidToken, false, 401);

        jwt.verify(refreshToken, userInformation[0].password);

        const newRefreshToken = jwt.sign({}, userInformation[0].password, {
                expiresIn: jwtConfig.jwtRefreshTokenDuration,
            }),
            newAccessToken = jwt.sign(
                {
                    username: userInformation[0].username,
                    email: userInformation[0].email,
                    role: userInformation[0].role,
                    avatarFileName: userInformation[0].avatarFileName,
                },
                userInformation[0].password,
                { expiresIn: jwtConfig.jwtAccessTokenDuration }
            );

        return new ModelResponse(staticTexts.verifyTokenSuccess, true, {
            refreshToken: newRefreshToken,
            accessToken: newAccessToken,
            user: {
                username: userInformation[0].username,
                email: userInformation[0].email,
                role: userInformation[0].role,
                avatarFileName: userInformation[0].avatarFileName,
            },
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError')
            return new ModelResponse(
                staticTexts.invalidToken,
                false,
                null,
                false,
                401
            );
        else if (error.name === 'TokenExpiredError')
            return new ModelResponse(
                staticTexts.tokenExpired,
                false,
                null,
                false,
                401
            );

        console.error(error);
        if (error.isServerError === undefined) error.isServerError = true;

        return new ModelResponse(
            error.isServerError === false
                ? error.message
                : staticTexts.unknownError,
            false,
            null,
            error.isServerError,
            error.statusCode
        );
    }
}

/**
 * Verify access token.
 * @param accessToken Access token.
 * @returns Returns user identification data.
 */
async function verifyAccessToken(accessToken: string) {
    try {
        if (!accessToken)
            throw new ModelError(
                `${staticTexts.invalidParameters}'accessToken'`,
                false,
                400
            );

        const decoded: any = jwt.decode(accessToken);
        if (!decoded?.username)
            throw new ModelError(staticTexts.invalidToken, false, 401);

        const currentTime = Math.floor(Date.now() / 1000),
            expirationTime = decoded.exp,
            timeUntilExpiration = expirationTime - currentTime;
        if (timeUntilExpiration < 60)
            return new ModelResponse(
                staticTexts.tokenExpired,
                false,
                { username: decoded?.username },
                false,
                401
            );

        const userCredentials = await query<RowDataPacket[]>(
            `SELECT * FROM credentials WHERE BINARY username = ?`,
            [decoded.username]
        );
        if (!userCredentials.length)
            return new ModelResponse(
                staticTexts.invalidToken,
                false,
                { username: decoded?.username },
                false,
                401
            );

        const verifyResult = jwt.verify(
            accessToken,
            userCredentials[0].password
        ) as any;

        return new ModelResponse(
            staticTexts.verifyTokenSuccess,
            true,
            {
                username: verifyResult?.username,
                email: verifyResult?.email,
                role: verifyResult?.role,
                avatarFileName: verifyResult?.avatarFileName,
            },
            false,
            200
        );
    } catch (error) {
        if (error.name === 'JsonWebTokenError')
            return new ModelResponse(
                staticTexts.invalidToken,
                false,
                null,
                false,
                401
            );
        else if (error.name === 'TokenExpiredError')
            return new ModelResponse(
                staticTexts.tokenExpired,
                false,
                null,
                false,
                401
            );

        console.error(error);
        if (error.isServerError === undefined) error.isServerError = true;

        return new ModelResponse(
            error.isServerError === false
                ? error.message
                : staticTexts.unknownError,
            false,
            null,
            error.isServerError,
            error.statusCode
        );
    }
}

/**
 * Middleware that ensures the user is authenticated and 'username' parameter is authentic.
 * @param request Express middleware request object.
 * @param response Express middleware response object.
 * @param next Express middleware next() function.
 * @returns Returns the response object.
 */
const authenticateUsername: RequestHandler = async (
    request,
    response: TypedResponse<RawAPIResponse<null>>,
    next
) => {
    const { refreshToken, accessToken } = request.cookies;

    const verifyAccessTokenResult = await verifyAccessToken(accessToken);
    let result = verifyAccessTokenResult;
    if (!verifyAccessTokenResult.success) {
        if (!verifyAccessTokenResult?.data?.username)
            return response
                .status(verifyAccessTokenResult.statusCode)
                .json(
                    new RawAPIResponse<null>(
                        verifyAccessTokenResult.message,
                        verifyAccessTokenResult.success,
                        verifyAccessTokenResult.data
                    )
                );

        const refreshTokensResult = await refreshTokens(
            refreshToken,
            verifyAccessTokenResult?.data?.username
        );
        if (!refreshTokensResult.success)
            return response
                .status(refreshTokensResult.statusCode)
                .json(
                    new RawAPIResponse<null>(
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
        request.cookies.refreshToken = refreshTokensResult?.data?.refreshToken;
        response.cookie(
            'accessToken',
            refreshTokensResult?.data?.accessToken,
            cookieOptions.authToken
        );
        request.cookies.accessToken = refreshTokensResult?.data?.accessToken;
    }
    const verifiedUsername =
        result?.data?.username || result?.data?.user?.username;

    const { username } = request.params;
    if (username?.toLowerCase() !== verifiedUsername?.toLowerCase())
        return response
            .status(403)
            .json(new RawAPIResponse<null>(staticTexts.invalidToken, false));
    request.params.username = verifiedUsername;
    next();
};

/**
 * Middleware that ensures the user is authenticated and the user is an admin user.
 * @param request Express middleware request object.
 * @param response Express middleware response object.
 * @param next Express middleware next() function.
 * @returns Returns the response object.
 */
const authenticateAdmin: RequestHandler = async (
    request,
    response: TypedResponse<RawAPIResponse<null>>,
    next
) => {
    const { refreshToken, accessToken } = request.cookies;

    const verifyAccessTokenResult = await verifyAccessToken(accessToken);
    let result = verifyAccessTokenResult;
    if (!verifyAccessTokenResult.success) {
        if (!verifyAccessTokenResult?.data?.username)
            return response
                .status(verifyAccessTokenResult.statusCode)
                .json(
                    new RawAPIResponse<null>(
                        verifyAccessTokenResult.message,
                        verifyAccessTokenResult.success,
                        verifyAccessTokenResult.data
                    )
                );

        const refreshTokensResult = await refreshTokens(
            refreshToken,
            verifyAccessTokenResult?.data?.username
        );
        if (!refreshTokensResult.success)
            return response
                .status(refreshTokensResult.statusCode)
                .json(
                    new RawAPIResponse<null>(
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
        request.cookies.refreshToken = refreshTokensResult?.data?.refreshToken;
        response.cookie(
            'accessToken',
            refreshTokensResult?.data?.accessToken,
            cookieOptions.authToken
        );
        request.cookies.accessToken = refreshTokensResult?.data?.accessToken;
    }
    const verifiedRole = result?.data?.role || result?.data?.user?.role;

    if (verifiedRole !== 'admin')
        return response
            .status(403)
            .json(new RawAPIResponse<null>(staticTexts.invalidToken, false));
    next();
};

export default {
    authorize,
    refreshTokens,
    verifyAccessToken,
    authenticateUsername,
    authenticateAdmin,
};
