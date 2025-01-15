/**
 * @file user.ts
 * @description User router controller.
 */

'use strict';
import formidable from 'formidable';
import { RequestHandler } from 'express';

import type { TypedResponse } from '@root/global';
import { RawAPIResponse } from '@sources/apis/emart/types';
import * as APITypes from '@sources/apis/emart/types';
import model from '@sources/models/user';

/**
 * User router controller.
 */
class UserController {
    // [GET] /user/:username
    getInfo: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.GetUserInfoResponseData>
        >,
        next
    ) => {
        const { username } = request.params;

        const userResult = await model.getInfo(username?.toLowerCase());

        return response
            .status(userResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.GetUserInfoResponseData>(
                    userResult.message,
                    userResult.success,
                    userResult.data
                )
            );
    };

    // [PATCH] /user/:username
    updateInfo: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.UpdateUserInfoResponseData>
        >,
        next
    ) => {
        const { username } = request.params;

        const updateInfoResult = await model.updateInfo(
            username?.toLowerCase(),
            request.body
        );

        return response
            .status(updateInfoResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.UpdateUserInfoResponseData>(
                    updateInfoResult.message,
                    updateInfoResult.success,
                    updateInfoResult.data
                )
            );
    };

    // [POST] /user/update-email-address
    updateEmailAddress: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.UpdateEmailAddressResponseData>
        >,
        next
    ) => {
        const { token } = request.body;

        const updateEmailAddressResult = await model.updateEmailAddress(token);

        return response
            .status(updateEmailAddressResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.UpdateEmailAddressResponseData>(
                    updateEmailAddressResult.message,
                    updateEmailAddressResult.success,
                    updateEmailAddressResult.data
                )
            );
    };

    // [POST] /user/:username/update-password
    updatePassword: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.UpdatePasswordResponseData>
        >,
        next
    ) => {
        const { username } = request.params,
            { currentPassword, newPassword } = request.body;

        const updatePasswordResult = await model.updatePassword(
            username?.toLowerCase(),
            currentPassword,
            newPassword
        );

        return response
            .status(updatePasswordResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.UpdatePasswordResponseData>(
                    updatePasswordResult.message,
                    updatePasswordResult.success,
                    updatePasswordResult.data
                )
            );
    };

    // [POST] /user/:username/delete-user
    deleteUser: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.DeleteUserResponseData>
        >,
        next
    ) => {
        const { username } = request.params,
            { currentPassword } = request.body;

        const deleteResult = await model.deleteUser(
            username?.toLowerCase(),
            currentPassword
        );

        return response
            .status(deleteResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.DeleteUserResponseData>(
                    deleteResult.message,
                    deleteResult.success,
                    deleteResult.data
                )
            );
    };

    // [GET] /user/admin-get-users
    getUsersAsAdmin: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.GetUsersAsAdminResponseData>
        >,
        next
    ) => {
        const query: { page?: string; itemPerPage?: string } = {
                ...request.query,
            },
            page = parseInt(query.page),
            itemPerPage = parseInt(query.itemPerPage);

        const usersResult = await model.getUsersAsAdmin(
            page || undefined,
            itemPerPage || undefined
        );

        return response
            .status(usersResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.GetUsersAsAdminResponseData>(
                    usersResult.message,
                    usersResult.success,
                    usersResult.data
                )
            );
    };

    // [POST] /user/admin-create
    createUserAsAdmin: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.CreateUserAsAdminResponseData>
        >,
        next
    ) => {
        try {
            const form = formidable({
                    maxFiles: 1,
                    allowEmptyFiles: true,
                    minFileSize: 0,
                }),
                parseResult = await form.parse(request),
                fields = parseResult[0],
                files = parseResult[1],
                emailArray = fields?.email || null,
                usernameArray = fields?.username || null,
                passwordArray = fields?.password || null,
                roleArray = fields?.role || null,
                avatarImageArray = files?.avatarImage || null,
                email = emailArray?.length ? emailArray[0] : null,
                username = usernameArray?.length ? usernameArray[0] : null,
                password = passwordArray?.length ? passwordArray[0] : null,
                role = roleArray?.length ? roleArray[0] : null,
                avatarImage = avatarImageArray?.length
                    ? avatarImageArray[0]
                    : null;

            const createResult = await model.createUserAsAdmin(
                email,
                username.toLowerCase(),
                password,
                role,
                avatarImage
            );

            return response
                .status(createResult.statusCode)
                .json(
                    new RawAPIResponse<APITypes.CreateUserAsAdminResponseData>(
                        createResult.message,
                        createResult.success,
                        createResult.data
                    )
                );
        } catch (error) {
            console.error(error);
            if (error.httpCode === 413)
                return response
                    .status(413)
                    .json(
                        new RawAPIResponse<APITypes.CreateUserAsAdminResponseData>(
                            'Số lượng tệp hoặc kích thước tệp vượt quá giới hạn.',
                            false,
                            null
                        )
                    );

            return response
                .status(500)
                .json(
                    new RawAPIResponse<APITypes.CreateUserAsAdminResponseData>(
                        'Có lỗi xảy ra.',
                        false,
                        null
                    )
                );
        }
    };

    // [PUT] /user/admin-update
    updateUserAsAdmin: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.UpdateUserAsAdminResponseData>
        >,
        next
    ) => {
        const { targetUsername, email, username, password, role } =
            request.body;

        const updateUserResult = await model.updateUserAsAdmin(
            targetUsername?.toLowerCase(),
            email,
            username?.toLowerCase(),
            password,
            role
        );

        return response
            .status(updateUserResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.UpdateUserAsAdminResponseData>(
                    updateUserResult.message,
                    updateUserResult.success,
                    updateUserResult.data
                )
            );
    };

    // [DELETE] /user/admin-delete
    deleteUserAsAdmin: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.DeleteUserAsAdminResponseData>
        >,
        next
    ) => {
        const { username } = request.body;

        const deleteUserResult = await model.deleteUserAsAdmin(
            username?.toLowerCase()
        );

        return response
            .status(deleteUserResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.DeleteUserAsAdminResponseData>(
                    deleteUserResult.message,
                    deleteUserResult.success,
                    deleteUserResult.data
                )
            );
    };

    // [POST] /user/:username/upload-avatar
    uploadUserAvatar: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.UploadUserAvatarResponseData>
        >,
        next
    ) => {
        try {
            const form = formidable({
                    maxFiles: 1,
                    allowEmptyFiles: true,
                    minFileSize: 0,
                }),
                parseResult = await form.parse(request),
                files = parseResult[1],
                avatarImageArray = files?.avatarImage || null,
                avatarImage = avatarImageArray?.length
                    ? avatarImageArray[0]
                    : null;

            const { username } = request.params;

            const uploadResult = await model.uploadUserAvatar(
                username?.toLowerCase(),
                avatarImage
            );

            return response
                .status(uploadResult.statusCode)
                .json(
                    new RawAPIResponse<APITypes.UploadUserAvatarResponseData>(
                        uploadResult.message,
                        uploadResult.success,
                        uploadResult.data
                    )
                );
        } catch (error) {
            console.error(error);
            if (error.httpCode === 413)
                return response
                    .status(413)
                    .json(
                        new RawAPIResponse<APITypes.UploadUserAvatarResponseData>(
                            'Số lượng tệp hoặc kích thước tệp vượt quá giới hạn.',
                            false,
                            null
                        )
                    );

            return response
                .status(500)
                .json(
                    new RawAPIResponse<APITypes.UploadUserAvatarResponseData>(
                        'Có lỗi xảy ra.',
                        false,
                        null
                    )
                );
        }
    };

    // [POST] /user/admin-upload-avatar
    uploadUserAvatarAsAdmin: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.UploadUserAvatarAsAdminResponseData>
        >,
        next
    ) => {
        try {
            const form = formidable({
                    maxFiles: 1,
                    allowEmptyFiles: true,
                    minFileSize: 0,
                }),
                parseResult = await form.parse(request),
                fields = parseResult[0],
                files = parseResult[1],
                usernameArray = fields?.username || null,
                avatarImageArray = files?.avatarImage || null,
                username = usernameArray?.length ? usernameArray[0] : null,
                avatarImage = avatarImageArray?.length
                    ? avatarImageArray[0]
                    : null;

            const uploadResult = await model.uploadUserAvatar(
                username?.toLowerCase(),
                avatarImage
            );

            return response
                .status(uploadResult.statusCode)
                .json(
                    new RawAPIResponse<APITypes.UploadUserAvatarAsAdminResponseData>(
                        uploadResult.message,
                        uploadResult.success,
                        uploadResult.data
                    )
                );
        } catch (error) {
            console.error(error);
            if (error.httpCode === 413)
                return response
                    .status(413)
                    .json(
                        new RawAPIResponse<APITypes.UploadUserAvatarAsAdminResponseData>(
                            'Số lượng tệp hoặc kích thước tệp vượt quá giới hạn.',
                            false,
                            null
                        )
                    );

            return response
                .status(500)
                .json(
                    new RawAPIResponse<APITypes.UploadUserAvatarAsAdminResponseData>(
                        'Có lỗi xảy ra.',
                        false,
                        null
                    )
                );
        }
    };
}

export default new UserController();
