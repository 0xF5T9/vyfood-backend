/**
 * @file index.ts
 * @description E-Mart apis.
 */

'use strict';
import axios, { isAxiosError } from 'axios';

import { APIFunction, APIResponse, RawAPIResponse } from './types';
import * as types from './types';
import staticTexts from './static-texts';

const backend = axios.create({
    baseURL: process.env.API_URL,
    timeout: 60000,
    withCredentials: true,
    fetchOptions: {
        credentials: 'same-origin',
    },
});

/**
 * Register a user.
 * @param email Email.
 * @param username Username.
 * @param password Password.
 * @returns Returns the API response object.
 */
export const register: APIFunction<types.RegisterResponseData> = async (
    email: string,
    username: string,
    password: string
) => {
    try {
        email = email.toLowerCase();

        if (!/^[a-z0-9](\.?[a-z0-9]){5,}@g(oogle)?mail\.com$/.test(email))
            return new APIResponse(staticTexts.invalidEmail, false);
        if (!/^[a-zA-Z0-9]+$/.test(username))
            return new APIResponse(
                staticTexts.invalidUsernameCharacters,
                false
            );
        if (username.length < 6 || username.length > 16)
            return new APIResponse(staticTexts.invalidUsernameLength, false);
        if (password.length < 8 || password.length > 32)
            return new APIResponse(staticTexts.invalidPasswordLength, false);

        const result = await backend.post<
                RawAPIResponse<types.RegisterResponseData>
            >(`register`, {
                email,
                username,
                password,
            }),
            { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.RegisterResponseData>>(error) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Get refresh token and access token using username and password.
 * @param username Username.
 * @param password Password.
 * @returns Returns the API response object.
 */
export const authorize: APIFunction<types.AuthorizeResponseData> = async (
    username: string,
    password: string
) => {
    try {
        const result = await backend.post<
            APIResponse<types.AuthorizeResponseData>
        >(`authorize`, {
            username,
            password,
        });
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.AuthorizeResponseData>>(error) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Send deauthorize request to the server. (Clear cookies)
 * @returns Returns the API response object.
 */
export const deauthorize: APIFunction<
    types.DeauthorizeResponseData
> = async () => {
    try {
        const result = await backend.post<
            APIResponse<types.DeauthorizeResponseData>
        >(`authorize/deauthorize`);
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.DeauthorizeResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Get new refresh and access token using current refresh token.
 * @param refreshToken Refresh token.
 * @param username Username.
 * @returns Returns the API response object.
 */
export const refreshTokens: APIFunction<
    types.RefreshTokensResponseData
> = async (refreshToken: string, username: string) => {
    try {
        const result = await backend.post<
            APIResponse<types.RefreshTokensResponseData>
        >(`authorize/refreshTokens`, {
            refreshToken,
            username,
        });
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.RefreshTokensResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Verify session.
 * @param forceRefreshToken Specifies whether to force refresh new token.
 * @returns Returns the API response object.
 */
export const verifySession: APIFunction<
    types.VerifySessionResponseData
> = async (forceRefreshToken: boolean = false) => {
    try {
        const result = await backend.post<
            APIResponse<types.VerifySessionResponseData>
        >(
            `authorize/verifySession${forceRefreshToken ? '?forceRefreshToken=1' : ''}`
        );
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.VerifySessionResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Send a forgot password request.
 * @param email Email address.
 * @returns Returns the API response object.
 */
export const forgotPassword: APIFunction<
    types.ForgotPasswordResponseData
> = async (email: string) => {
    try {
        email = email.toLowerCase();

        if (!/^[a-z0-9](\.?[a-z0-9]){5,}@g(oogle)?mail\.com$/.test(email))
            return new APIResponse(staticTexts.invalidEmail, false);

        const result = await backend.post<
            APIResponse<types.ForgotPasswordResponseData>
        >(`recovery/forgot-password`, {
            email,
        });
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.ForgotPasswordResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Send a forgot password request.
 * @param token Reset password token.
 * @param newPassword New password.
 * @returns Returns the API response object.
 */
export const resetPassword: APIFunction<
    types.ResetPasswordResponseData
> = async (token: string, newPassword: string) => {
    try {
        if (!token || !newPassword)
            return new APIResponse(
                staticTexts.invalidResetPasswordRequest,
                false
            );

        if (newPassword.length < 8 || newPassword.length > 32)
            return new APIResponse(staticTexts.invalidPasswordLength, false);

        const result = await backend.post<
            APIResponse<types.ResetPasswordResponseData>
        >(`recovery/reset-password`, {
            token,
            newPassword,
        });
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.ResetPasswordResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Upload user avatar.
 * @param username Username.
 * @param avatarImage Avatar image.
 * @returns Returns the API response object.
 */
export const uploadUserAvatar: APIFunction<
    types.UploadUserAvatarResponseData
> = async (username: string, avatarImage: string | Blob) => {
    try {
        if (!username || !avatarImage)
            return new APIResponse(
                `${staticTexts.invalidParameters}'username', 'avatarImage'`,
                false
            );

        const form = new FormData();
        form.append('avatarImage', avatarImage);

        const result = await backend.post<
            APIResponse<types.UploadUserAvatarResponseData>
        >(`user/${username}/upload-avatar`, form);

        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.UploadUserAvatarResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Get user information.
 * @param username Username.
 * @returns Returns the API response object.
 */
export const getUserInfo: APIFunction<types.GetUserInfoResponseData> = async (
    username: string
) => {
    try {
        const result = await backend.get<
            APIResponse<types.GetUserInfoResponseData>
        >(`user/${username}`);
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.GetUserInfoResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Update user information.
 * @param username Username.
 * @param fields Update fields.
 * @returns Returns the API response object.
 */
export const updateUserInfo: APIFunction<
    types.UpdateUserInfoResponseData
> = async (username: string, fields: { email?: string }) => {
    try {
        if (!username)
            return new APIResponse(
                staticTexts.invalidUpdateUserInfoRequest,
                false
            );

        const { email } = fields;

        if (
            email &&
            !/^[a-z0-9](\.?[a-z0-9]){5,}@g(oogle)?mail\.com$/.test(email)
        )
            return new APIResponse(staticTexts.invalidEmail, false);

        const result = await backend.patch<
            APIResponse<types.UpdateUserInfoResponseData>
        >(`user/${username}`, {
            email,
        });
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.UpdateUserInfoResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Update email address.
 * @param token Update email address token.
 * @returns Returns the API response object.
 */
export const updateEmailAddress: APIFunction<
    types.UpdateEmailAddressResponseData
> = async (token: string) => {
    try {
        if (!token)
            return new APIResponse(
                staticTexts.invalidUpdateEmailRequest,
                false
            );

        const result = await backend.post<
            APIResponse<types.UpdateEmailAddressResponseData>
        >(`user/update-email-address`, {
            token,
        });
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.UpdateEmailAddressResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Update password.
 * @param username Username.
 * @param currentPassword Current password.
 * @param newPassword New password.
 * @returns Returns the API response object.
 */
export const updatePassword: APIFunction<
    types.UpdatePasswordResponseData
> = async (username: string, currentPassword: string, newPassword: string) => {
    try {
        if (!username || !currentPassword || !newPassword)
            return new APIResponse(
                staticTexts.invalidUpdatePasswordRequest,
                false
            );

        if (newPassword.length < 8 || newPassword.length > 32)
            return new APIResponse(staticTexts.invalidPasswordLength, false);

        const result = await backend.post<
            APIResponse<types.UpdatePasswordResponseData>
        >(`user/${username}/update-password`, {
            currentPassword,
            newPassword,
        });
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.UpdatePasswordResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Delete user.
 * @param username Username.
 * @param currentPassword Current password.
 * @returns Returns the API response object.
 */
export const deleteUser: APIFunction<types.DeleteUserResponseData> = async (
    username: string,
    currentPassword: string
) => {
    try {
        if (!username || !currentPassword)
            return new APIResponse(
                staticTexts.invalidDeleteAccountRequest,
                false
            );

        const result = await backend.post<
            APIResponse<types.DeleteUserResponseData>
        >(`user/${username}/delete-user`, {
            currentPassword,
        });
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.DeleteUserResponseData>>(error) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Get users as admin.
 * @param page Pagination (default: 1)
 * @param itemPerPage Item per page. (default: 99999)
 * @returns Returns the API response object.
 */
export const getUsersAsAdmin: APIFunction<
    types.GetUsersAsAdminResponseData
> = async (page: number = 1, itemPerPage: number = 99999) => {
    try {
        const result = await backend.get<
            APIResponse<types.GetUsersAsAdminResponseData>
        >(`/user/admin-get-users?page=${page}&itemPerPage=${itemPerPage}`);
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.GetUsersAsAdminResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Create user as admin.
 * @param username Username.
 * @param password Password.
 * @param email Email address.
 * @param role User role.
 * @param avatarImage User avatar image.
 * @returns Returns the API response object.
 */
export const createUserAsAdmin: APIFunction<
    types.CreateUserAsAdminResponseData
> = async (
    username: string,
    password: string,
    email: string,
    role: string,
    avatarImage: string | Blob
) => {
    try {
        email = email.toLowerCase();

        if (!username || !password || !email || !role)
            return new APIResponse(
                `${staticTexts.invalidParameters}'username', 'password', 'email', 'role'`,
                false
            );

        if (!/^[a-z0-9](\.?[a-z0-9]){5,}@g(oogle)?mail\.com$/.test(email))
            return new APIResponse(staticTexts.invalidEmail, false);
        if (!/^[a-zA-Z0-9]+$/.test(username))
            return new APIResponse(
                staticTexts.invalidUsernameCharacters,
                false
            );
        if (username.length < 6 || username.length > 16)
            return new APIResponse(staticTexts.invalidUsernameLength, false);
        if (password.length < 8 || password.length > 32)
            return new APIResponse(staticTexts.invalidPasswordLength, false);

        const form = new FormData();
        form.append('username', username);
        form.append('password', password);
        form.append('email', email);
        form.append('role', role);
        form.append('avatarImage', avatarImage);

        const result = await backend.post<
            APIResponse<types.CreateUserAsAdminResponseData>
        >('/user/admin-create', form);

        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.CreateUserAsAdminResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Update user as admin.
 * @param targetUsername Target username.
 * @param username Username.
 * @param password Password.
 * @param email Email address.
 * @param role User role.
 * @returns Returns the API response object.
 */
export const updateUserAsAdmin: APIFunction<
    types.UpdateUserAsAdminResponseData
> = async (
    targetUsername: string,
    username: string,
    password: string,
    email: string,
    role: string
) => {
    try {
        email = email.toLowerCase();

        if (!targetUsername)
            return new APIResponse(
                `${staticTexts.invalidParameters}'targetUsername'`,
                false
            );

        if (
            email &&
            !/^[a-z0-9](\.?[a-z0-9]){5,}@g(oogle)?mail\.com$/.test(email)
        )
            return new APIResponse(staticTexts.invalidEmail, false);
        if (username && !/^[a-zA-Z0-9]+$/.test(username))
            return new APIResponse(
                staticTexts.invalidUsernameCharacters,
                false
            );
        if ((username && username.length < 6) || username.length > 16)
            return new APIResponse(staticTexts.invalidUsernameLength, false);
        if ((password && password.length < 8) || password.length > 32)
            return new APIResponse(staticTexts.invalidPasswordLength, false);

        const result = await backend.patch<
            APIResponse<types.UpdateUserAsAdminResponseData>
        >('/user/admin-update', {
            targetUsername,
            username,
            password,
            email,
            role,
        });

        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.UpdateUserAsAdminResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Delete an user as admin.
 * @param username Username.
 * @returns Returns the API response object.
 */
export const deleteUserAsAdmin: APIFunction<
    types.DeleteUserAsAdminResponseData
> = async (username: string) => {
    try {
        if (!username)
            return new APIResponse(
                `${staticTexts.invalidParameters}'username'`,
                false
            );

        const result = await backend.delete<
            APIResponse<types.DeleteUserAsAdminResponseData>
        >(`user/admin-delete`, {
            data: {
                username,
            },
        });
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.DeleteUserAsAdminResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Upload user avatar as admin.
 * @param username Username.
 * @param avatarImage Avatar image.
 * @returns Returns the API response object.
 */
export const uploadUserAvatarAsAdmin: APIFunction<
    types.UploadUserAvatarAsAdminResponseData
> = async (username: string, avatarImage: string | Blob) => {
    try {
        if (!username || !avatarImage)
            return new APIResponse(
                `${staticTexts.invalidParameters}'username', 'avatarImage'`,
                false
            );

        const form = new FormData();
        form.append('username', username);
        form.append('avatarImage', avatarImage);

        const result = await backend.post<
            APIResponse<types.UploadUserAvatarAsAdminResponseData>
        >('user/admin-upload-avatar', form);

        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<
                RawAPIResponse<types.UploadUserAvatarAsAdminResponseData>
            >(error) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Get products.
 * @param page Pagination (default: 1)
 * @param itemPerPage Item per page. (default: 99999)
 * @returns Returns the API response object.
 */
export const getProducts: APIFunction<types.GetProductsResponseData> = async (
    page: number = 1,
    itemPerPage: number = 99999
) => {
    try {
        const result = await backend.get<
            APIResponse<types.GetProductsResponseData>
        >(`product?page=${page}&itemPerPage=${itemPerPage}`);
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.GetProductsResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Create product.
 * @param name Product name.
 * @param categories Product categories.
 * @param desc Product description.
 * @param price Product price.
 * @param quantity Product quantity.
 * @param priority Product priority.
 * @param image Product image.
 * @returns Returns the API response object.
 */
export const createProduct: APIFunction<
    types.CreateProductResponseData
> = async (
    name: string,
    categories: string,
    desc: string,
    price: number,
    quantity: number,
    priority: number,
    image: string | Blob
) => {
    try {
        if (
            !name ||
            (!price && price !== 0) ||
            (!quantity && quantity !== 0) ||
            (!priority && priority !== 0)
        )
            return new APIResponse(
                `${staticTexts.invalidParameters}'name', 'price', 'quantity', 'priority'`,
                false
            );

        const form = new FormData();
        form.append('name', name);
        form.append('categories', categories);
        form.append('desc', desc);
        form.append('price', `${price}`?.replace(/\D/g, ''));
        form.append('quantity', `${quantity}`?.replace(/\D/g, ''));
        form.append('priority', `${priority}`?.replace(/\D/g, ''));
        form.append('image', image);

        const result = await backend.post<
            APIResponse<types.CreateProductResponseData>
        >('product', form);

        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.CreateProductResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Update product.
 * @param slug Product slug.
 * @param name Product name.
 * @param categories Product categories.
 * @param desc Product description.
 * @param price Product price.
 * @param priority Product priority.
 * @param quantity Product quantity.
 * @returns Returns the API response object.
 */
export const updateProduct: APIFunction<
    types.UpdateProductResponseData
> = async (
    slug: string,
    name: string,
    categories: string,
    desc: string,
    price: number,
    priority: number,
    quantity?: number
) => {
    try {
        if (
            !slug ||
            !name ||
            (!price && price !== 0) ||
            (!priority && priority !== 0)
        )
            return new APIResponse(
                `${staticTexts.invalidParameters}'slug', 'name', 'price', 'priority'`,
                false
            );

        const result = await backend.put<
            APIResponse<types.UpdateProductResponseData>
        >(`product`, {
            slug,
            name,
            categories,
            desc,
            price,
            quantity,
            priority,
        });
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.UpdateProductResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Delete product.
 * @param slug Product slug.
 * @returns Returns the API response object.
 */
export const deleteProduct: APIFunction<
    types.DeleteProductResponseData
> = async (slug: string) => {
    try {
        if (!slug)
            return new APIResponse(
                `${staticTexts.invalidParameters}'slug'`,
                false
            );

        const result = await backend.delete<
            APIResponse<types.DeleteProductResponseData>
        >(`product`, {
            data: {
                slug,
            },
        });
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.DeleteProductResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Upload product image.
 * @param slug Product slug.
 * @param image Product image.
 * @returns Returns the API response object.
 */
export const uploadProductImage: APIFunction<
    types.UploadProductImageResponseData
> = async (slug: string, image: string | Blob) => {
    try {
        if (!slug || !image)
            return new APIResponse(
                `${staticTexts.invalidParameters}'slug', 'image'`,
                false
            );

        const form = new FormData();
        form.append('slug', slug);
        form.append('image', image);

        const result = await backend.post<
            APIResponse<types.UploadProductImageResponseData>
        >('product/image', form);

        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.UploadProductImageResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Get categories.
 * @param page Pagination (default: 1)
 * @param itemPerPage Item per page. (default: 99999)
 * @returns Returns the API response object.
 */
export const getCategories: APIFunction<
    types.GetCategoriesResponseData
> = async (page: number = 1, itemPerPage: number = 99999) => {
    try {
        const result = await backend.get<
            APIResponse<types.GetCategoriesResponseData>
        >(`category?page=${page}&itemPerPage=${itemPerPage}`);
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.GetCategoriesResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Get product counts from categories.
 * @returns Returns the API response object.
 */
export const getCategoriesCount: APIFunction<
    types.GetCategoriesCountResponseData
> = async () => {
    try {
        const result = await backend.get<
            APIResponse<types.GetCategoriesCountResponseData>
        >(`category/categoriesCount`);
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.GetCategoriesCountResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Create category.
 * @param name Category name.
 * @param desc Category description.
 * @param priority Category priority.
 * @param image Category image.
 * @returns Returns the API response object.
 */
export const createCategory: APIFunction<
    types.CreateCategoryResponseData
> = async (
    name: string,
    desc: string,
    priority: number,
    image: string | Blob
) => {
    try {
        if (!name || (!priority && priority !== 0))
            return new APIResponse(
                `${staticTexts.invalidParameters}'name', 'priority'`,
                false
            );

        const form = new FormData();
        form.append('name', name);
        form.append('desc', desc);
        form.append('priority', `${priority}`?.replace(/\D/g, ''));
        form.append('image', image);

        const result = await backend.post<
            APIResponse<types.CreateCategoryResponseData>
        >('category', form);

        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.CreateCategoryResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Update category.
 * @param slug Category slug.
 * @param name Category name.
 * @param desc Category description.
 * @param priority Category priority.
 * @returns Returns the API response object.
 */
export const updateCategory: APIFunction<
    types.UpdateCategoryResponseData
> = async (slug: string, name: string, desc: string, priority: number) => {
    try {
        if (!slug || !name || (!priority && priority !== 0))
            return new APIResponse(
                `${staticTexts.invalidParameters}'slug', 'name', 'priority'`,
                false
            );

        const result = await backend.put<
            APIResponse<types.UpdateCategoryResponseData>
        >(`category`, {
            slug,
            name,
            desc,
            priority,
        });
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.UpdateCategoryResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Delete category.
 * @param slug Category slug.
 * @returns Returns the API response object.
 */
export const deleteCategory: APIFunction<
    types.DeleteCategoryResponseData
> = async (slug: string) => {
    try {
        if (!slug)
            return new APIResponse(
                `${staticTexts.invalidParameters}'slug'`,
                false
            );

        const result = await backend.delete<
            APIResponse<types.DeleteCategoryResponseData>
        >(`category`, {
            data: {
                slug,
            },
        });
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.DeleteCategoryResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Upload category image.
 * @param slug Category slug.
 * @param image Category image.
 * @returns Returns the API response object.
 */
export const uploadCategoryImage: APIFunction<
    types.UploadCategoryImageResponseData
> = async (slug: string, image: string | Blob) => {
    try {
        if (!slug || !image)
            return new APIResponse(
                `${staticTexts.invalidParameters}'slug', 'image'`,
                false
            );

        const form = new FormData();
        form.append('slug', slug);
        form.append('image', image);

        const result = await backend.post<
            APIResponse<types.UploadCategoryImageResponseData>
        >('category/image', form);

        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.UploadCategoryImageResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Get orders.
 * @param page Pagination (default: 1)
 * @param itemPerPage Item per page. (default: 99999)
 * @returns Returns the API response object.
 */
export const getOrders: APIFunction<types.GetOrdersResponseData> = async (
    page: number = 1,
    itemPerPage: number = 99999
) => {
    try {
        const result = await backend.get<
            APIResponse<types.GetOrdersResponseData>
        >(`order?page=${page}&itemPerPage=${itemPerPage}`);
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.GetOrdersResponseData>>(error) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Create order.
 * @param deliveryMethod Delivery method.
 * @param customerName Customer name.
 * @param customerPhoneNumber Customer phone number.
 * @param items Order items.
 * @param deliveryAddress Delivery address.
 * @param deliveryTime Delivery time.
 * @param pickupAt Pickup location.
 * @param deliveryNote Delivery note.
 * @returns Returns the API response object.
 */
export const createOrder: APIFunction<types.CreateOrderResponseData> = async (
    deliveryMethod: string,
    customerName: string,
    customerPhoneNumber: string,
    items: unknown,
    deliveryAddress?: string,
    deliveryTime?: number,
    pickupAt?: string,
    deliveryNote?: string
) => {
    try {
        if (!deliveryMethod || !customerName || !customerPhoneNumber || !items)
            return new APIResponse(
                `${staticTexts.invalidParameters}'deliveryMethod', 'customerName', 'customerPhoneNumber', 'items'`,
                false
            );

        if (deliveryMethod !== 'shipping' && deliveryMethod !== 'pickup')
            return new APIResponse(staticTexts.invalidShippingMethod, false);

        if (deliveryMethod === 'shipping' && !deliveryAddress)
            return new APIResponse(
                `${staticTexts.invalidParameters}'deliveryAddress'`,
                false
            );

        if (deliveryMethod === 'pickup' && !pickupAt)
            return new APIResponse(
                `${staticTexts.invalidParameters}'pickupAt'`,
                false
            );

        const result = await backend.post<
            APIResponse<types.CreateOrderResponseData>
        >('order', {
            deliveryMethod,
            customerName,
            customerPhoneNumber,
            items,
            deliveryAddress,
            deliveryTime,
            pickupAt,
            deliveryNote,
        });

        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.CreateOrderResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Update order.
 * @param orderId Order id.
 * @param status Order status.
 * @returns Returns the API response object.
 */
export const updateOrder: APIFunction<types.UpdateOrderResponseData> = async (
    orderId: number,
    status?:
        | 'processing'
        | 'shipping'
        | 'completed'
        | 'refunding'
        | 'aborted'
        | 'refunded'
) => {
    try {
        if (!orderId)
            return new APIResponse(
                `${staticTexts.invalidParameters}'orderId'`,
                false
            );

        if (status) {
            if (
                status !== 'processing' &&
                status !== 'shipping' &&
                status !== 'completed' &&
                status !== 'refunding' &&
                status !== 'aborted' &&
                status !== 'refunded'
            )
                return new APIResponse(staticTexts.invalidOrderStatus, false);
        }

        const result = await backend.patch<
            APIResponse<types.UpdateOrderResponseData>
        >('order', {
            orderId,
            status,
        });

        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.UpdateOrderResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Delete order.
 * @param orderId Order id.
 * @returns Returns the API response object.
 */
export const deleteOrder: APIFunction<types.DeleteOrderResponseData> = async (
    orderId: number
) => {
    try {
        if (!orderId)
            return new APIResponse(
                `${staticTexts.invalidParameters}'orderId'`,
                false
            );

        const result = await backend.delete<
            APIResponse<types.DeleteOrderResponseData>
        >(`order`, {
            data: {
                orderId,
            },
        });
        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.DeleteOrderResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Restore order product quantity.
 * @param orderId Order id.
 * @returns Returns the API response object.
 */
export const restoreOrderProductQuantity: APIFunction<
    types.RestoreProductQuantityResponseData
> = async (orderId: number) => {
    try {
        if (!orderId)
            return new APIResponse(
                `${staticTexts.invalidParameters}'orderId'`,
                false
            );

        const result = await backend.post<
            APIResponse<types.RestoreProductQuantityResponseData>
        >('order/restore-product-quantity', {
            orderId,
        });

        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<
                RawAPIResponse<types.RestoreProductQuantityResponseData>
            >(error) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Send a subscrible newsletter confirmation mail.
 * @param email The email.
 * @returns Returns the API response object.
 */
export const subscribeNewsletter: APIFunction<
    types.SubscribeNewsletterResponseData
> = async (email: string) => {
    try {
        if (!email)
            return new APIResponse(
                `${staticTexts.invalidParameters}'email'`,
                false
            );

        const result = await backend.post<
            APIResponse<types.SubscribeNewsletterResponseData>
        >('newsletter/subscribe', {
            email,
        });

        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<RawAPIResponse<types.SubscribeNewsletterResponseData>>(
                error
            ) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};

/**
 * Confirm a newsletter subscribe request.
 * @param newsletterToken The subscribe newsletter token.
 * @returns Returns the API response object.
 */
export const subscribeNewsletterConfirmation: APIFunction<
    types.SubscribeNewsletterConfirmationResponseData
> = async (newsletterToken: string) => {
    try {
        if (!newsletterToken)
            return new APIResponse(
                `${staticTexts.invalidParameters}'newsletterToken'`,
                false
            );

        const result = await backend.post<
            APIResponse<types.SubscribeNewsletterConfirmationResponseData>
        >('newsletter/confirm', {
            newsletterToken,
        });

        const { message, success, data } = result.data;

        return new APIResponse(message, success, data, result.status);
    } catch (error: unknown) {
        if (
            isAxiosError<
                RawAPIResponse<types.SubscribeNewsletterConfirmationResponseData>
            >(error) &&
            error.response
        ) {
            return new APIResponse(
                error.response.data.message,
                error.response.data.success,
                error.response.data.data,
                error.response.status
            );
        } else {
            console.error(error);
            return new APIResponse(
                staticTexts.unknownError,
                false,
                error as any,
                500
            );
        }
    }
};
