/**
 * @file authorize.ts
 * @description Authorize router models.
 */

'use strict';
import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { query } from '@sources/services/database';
import { ModelError, ModelResponse } from '@sources/utility/model';
import jwtConfig from '@root/configs/jwt.json';

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
                `Thông tin 'username', 'password' bị thiếu.`,
                false,
                400
            );

        const userInformation = (await query(
            `SELECT c.username, c.password, u.email, u.role, u.avatarFileName
                                                FROM credentials c JOIN users u 
                                                ON c.username = u.username 
                                                WHERE c.username = ?`,
            [username]
        )) as any[];
        if (!userInformation.length)
            throw new ModelError(
                'Tên người dùng hoặc mật khẩu chưa chính xác.',
                false,
                401
            );

        const compareResult = await bcrypt.compare(
            password,
            userInformation[0].password
        );
        if (!compareResult)
            throw new ModelError(
                'Tên người dùng hoặc mật khẩu chưa chính xác.',
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

        return new ModelResponse('Xác thực token thành công.', true, {
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
            error.isServerError === false ? error.message : 'Có lỗi xảy ra.',
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
                `Thông tin 'refreshToken', 'username' bị thiếu.`,
                false,
                400
            );

        const userInformation = (await query(
            `SELECT c.username, c.password, u.email, u.role, u.avatarFileName
                                                    FROM credentials c JOIN users u 
                                                    ON c.username = u.username 
                                                    WHERE c.username = ?`,
            [username]
        )) as any[];
        if (!userInformation.length)
            throw new ModelError('Token không hợp lệ.', false, 401);

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

        return new ModelResponse('Xác thực token thành công.', true, {
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
                'Token không hợp lệ.',
                false,
                null,
                false,
                401
            );
        else if (error.name === 'TokenExpiredError')
            return new ModelResponse(
                'Token đã hết hạn.',
                false,
                null,
                false,
                401
            );

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
 * Verify access token.
 * @param accessToken Access token.
 * @returns Returns user identification data.
 */
async function verifyAccessToken(accessToken: string) {
    try {
        if (!accessToken)
            throw new ModelError(`Token không hợp lệ.`, false, 400);

        const decoded: any = jwt.decode(accessToken);
        if (!decoded?.username)
            throw new ModelError('Token không hợp lệ.', false, 401);

        const currentTime = Math.floor(Date.now() / 1000),
            expirationTime = decoded.exp,
            timeUntilExpiration = expirationTime - currentTime;
        if (timeUntilExpiration < 60)
            return new ModelResponse(
                'Token đã hết hạn',
                false,
                { username: decoded?.username },
                false,
                401
            );

        const userCredentials: any = await query(
            `SELECT * FROM credentials WHERE username = ?`,
            [decoded.username]
        );
        if (!userCredentials.length)
            return new ModelResponse(
                'Token không hợp lệ.',
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
            'Xác thực token thành công.',
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
                'Token không hợp lệ.',
                false,
                null,
                false,
                401
            );
        else if (error.name === 'TokenExpiredError')
            return new ModelResponse(
                'Token đã hết hạn.',
                false,
                null,
                false,
                401
            );

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
 * Middleware that ensures the user is authenticated and 'username' parameter is authentic.
 * @param request Express middleware request object.
 * @param response Express middleware response object.
 * @param next Express middleware next() function.
 * @returns Returns the response object.
 */
const authenticateUsername: RequestHandler = async (
    request,
    response,
    next
) => {
    const { refreshToken, accessToken } = request.cookies;

    const verifyAccessTokenResult = await verifyAccessToken(accessToken);
    let result = verifyAccessTokenResult;
    if (!verifyAccessTokenResult.success) {
        if (!verifyAccessTokenResult?.data?.username)
            return response
                .status(verifyAccessTokenResult.statusCode)
                .json({ message: verifyAccessTokenResult.message });

        const refreshTokensResult = await refreshTokens(
            refreshToken,
            verifyAccessTokenResult?.data?.username
        );
        if (!refreshTokensResult.success)
            return response
                .status(refreshTokensResult.statusCode)
                .json({ message: refreshTokensResult.message });
        result = refreshTokensResult;

        response.cookie(
            'refreshToken',
            refreshTokensResult?.data?.refreshToken,
            {
                httpOnly: true,
                maxAge: 365 * 24 * 60 * 60 * 1000,
                secure: process.env.NODE_ENV === 'production' ? true : false,
                sameSite:
                    process.env.NODE_ENV === 'production' ? 'strict' : false,
            }
        );
        request.cookies.refreshToken = refreshTokensResult?.data?.refreshToken;
        response.cookie('accessToken', refreshTokensResult?.data?.accessToken, {
            httpOnly: true,
            maxAge: 365 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : false,
        });
        request.cookies.accessToken = refreshTokensResult?.data?.accessToken;
    }
    const verifiedUsername =
        result?.data?.username || result?.data?.user?.username;

    const { username } = request.params;
    if (username?.toLowerCase() !== verifiedUsername?.toLowerCase())
        return response.status(403).json({ message: 'Token không hợp lệ.' });
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
const authenticateAdmin: RequestHandler = async (request, response, next) => {
    const { refreshToken, accessToken } = request.cookies;

    const verifyAccessTokenResult = await verifyAccessToken(accessToken);
    let result = verifyAccessTokenResult;
    if (!verifyAccessTokenResult.success) {
        if (!verifyAccessTokenResult?.data?.username)
            return response
                .status(verifyAccessTokenResult.statusCode)
                .json({ message: verifyAccessTokenResult.message });

        const refreshTokensResult = await refreshTokens(
            refreshToken,
            verifyAccessTokenResult?.data?.username
        );
        if (!refreshTokensResult.success)
            return response
                .status(refreshTokensResult.statusCode)
                .json({ message: refreshTokensResult.message });
        result = refreshTokensResult;

        response.cookie(
            'refreshToken',
            refreshTokensResult?.data?.refreshToken,
            {
                httpOnly: true,
                maxAge: 365 * 24 * 60 * 60 * 1000,
                secure: process.env.NODE_ENV === 'production' ? true : false,
                sameSite:
                    process.env.NODE_ENV === 'production' ? 'strict' : false,
            }
        );
        request.cookies.refreshToken = refreshTokensResult?.data?.refreshToken;
        response.cookie('accessToken', refreshTokensResult?.data?.accessToken, {
            httpOnly: true,
            maxAge: 365 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : false,
        });
        request.cookies.accessToken = refreshTokensResult?.data?.accessToken;
    }
    const verifiedRole = result?.data?.role || result?.data?.user?.role;

    if (verifiedRole !== 'admin')
        return response.status(403).json({ message: 'Token không hợp lệ.' });
    next();
};

export default {
    authorize,
    refreshTokens,
    verifyAccessToken,
    authenticateUsername,
    authenticateAdmin,
};
