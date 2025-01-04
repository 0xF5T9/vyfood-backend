/**
 * @file user.ts
 * @description User router controller.
 */

'use strict';
import formidable from 'formidable';
import { RequestHandler } from 'express';

import model from '@sources/models/user';

/**
 * User router controller.
 */
class UserController {
    // [GET] /user/:username
    getInfo: RequestHandler = async (request, response, next) => {
        const { username } = request.params;

        const userResult = await model.getInfo(username?.toLowerCase());
        if (!userResult.success)
            return response.status(userResult.statusCode).json({
                message: userResult.message,
            });

        return response.status(userResult.statusCode).json({
            message: userResult.message,
            data: userResult.data,
        });
    };

    // [PATCH] /user/:username
    updateInfo: RequestHandler = async (request, response, next) => {
        const { username } = request.params;

        const updateInfoResult = await model.updateInfo(
            username?.toLowerCase(),
            request.body
        );
        if (!updateInfoResult.success)
            return response.status(updateInfoResult.statusCode).json({
                message: updateInfoResult.message,
            });

        return response.status(updateInfoResult.statusCode).json({
            message: updateInfoResult.message,
            data: updateInfoResult.data,
        });
    };

    // [POST] /user/update-email-address
    updateEmailAddress: RequestHandler = async (request, response, next) => {
        const { token } = request.body;

        const updateEmailAddressResult = await model.updateEmailAddress(token);
        if (!updateEmailAddressResult.success)
            return response
                .status(updateEmailAddressResult.statusCode)
                .json({ message: 'Yêu cầu không hợp lệ.' });

        return response.status(updateEmailAddressResult.statusCode).json({
            message: updateEmailAddressResult.message,
            data: updateEmailAddressResult.data,
        });
    };

    // [POST] /user/:username/update-password
    updatePassword: RequestHandler = async (request, response, next) => {
        const { username } = request.params,
            { currentPassword, newPassword } = request.body;

        const updatePasswordResult = await model.updatePassword(
            username?.toLowerCase(),
            currentPassword,
            newPassword
        );
        if (!updatePasswordResult.success)
            return response
                .status(updatePasswordResult.statusCode)
                .json({ message: updatePasswordResult.message });

        return response.status(updatePasswordResult.statusCode).json({
            message: updatePasswordResult.message,
            data: updatePasswordResult.data,
        });
    };

    // [POST] /user/:username/delete-user
    deleteUser: RequestHandler = async (request, response, next) => {
        const { username } = request.params,
            { currentPassword } = request.body;

        const deleteResult = await model.deleteUser(
            username?.toLowerCase(),
            currentPassword
        );
        if (!deleteResult.success)
            return response
                .status(deleteResult.statusCode)
                .json({ message: deleteResult.message });

        return response.status(deleteResult.statusCode).json({
            message: deleteResult.message,
            data: deleteResult.data,
        });
    };

    // [GET] /user/admin-get-users
    getUsersAsAdmin: RequestHandler = async (request, response, next) => {
        const query: { page?: string; itemPerPage?: string } = {
                ...request.query,
            },
            page = parseInt(query.page),
            itemPerPage = parseInt(query.itemPerPage);

        const usersResult = await model.getUsersAsAdmin(
            page || undefined,
            itemPerPage || undefined
        );
        if (!usersResult.success)
            return response.status(usersResult.statusCode).json({
                message: usersResult.message,
            });

        return response.status(usersResult.statusCode).json({
            message: usersResult.message,
            data: usersResult.data,
        });
    };

    // [POST] /user/admin-create
    createUserAsAdmin: RequestHandler = async (request, response, next) => {
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
            if (!createResult.success)
                return response
                    .status(createResult.statusCode)
                    .json({ message: createResult.message });

            return response.status(201).json({
                message: createResult.message,
                data: createResult.data,
            });
        } catch (error) {
            console.error(error);
            if (error.httpCode === 413)
                return response.status(413).json({
                    message:
                        'Số lượng tệp hoặc kích thước tệp vượt quá giới hạn.',
                    data: null,
                });

            return response
                .status(500)
                .json({ message: 'Có lỗi xảy ra.', data: null });
        }
    };

    // [PUT] /user/admin-update
    updateUserAsAdmin: RequestHandler = async (request, response, next) => {
        const { targetUsername, email, username, password, role } =
            request.body;

        const updateUserResult = await model.updateUserAsAdmin(
            targetUsername?.toLowerCase(),
            email,
            username?.toLowerCase(),
            password,
            role
        );
        if (!updateUserResult.success)
            return response.status(updateUserResult.statusCode).json({
                message: updateUserResult.message,
            });

        return response.status(updateUserResult.statusCode).json({
            message: updateUserResult.message,
            data: updateUserResult.data,
        });
    };

    // [DELETE] /user/admin-delete
    deleteUserAsAdmin: RequestHandler = async (request, response, next) => {
        const { username } = request.body;

        const deleteUserResult = await model.deleteUserAsAdmin(
            username?.toLowerCase()
        );
        if (!deleteUserResult.success)
            return response.status(deleteUserResult.statusCode).json({
                message: deleteUserResult.message,
            });

        return response.status(deleteUserResult.statusCode).json({
            message: deleteUserResult.message,
            data: deleteUserResult.data,
        });
    };

    // [POST] /user/:username/upload-avatar
    uploadUserAvatar: RequestHandler = async (request, response, next) => {
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
            if (!uploadResult.success)
                return response
                    .status(uploadResult.statusCode)
                    .json({ message: uploadResult.message });

            return response.status(201).json({
                message: uploadResult.message,
                data: uploadResult.data,
            });
        } catch (error) {
            console.error(error);
            if (error.httpCode === 413)
                return response.status(413).json({
                    message:
                        'Số lượng tệp hoặc kích thước tệp vượt quá giới hạn.',
                    data: null,
                });

            return response
                .status(500)
                .json({ message: 'Có lỗi xảy ra.', data: null });
        }
    };

    // [POST] /user/admin-upload-avatar
    uploadUserAvatarAsAdmin: RequestHandler = async (
        request,
        response,
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
            if (!uploadResult.success)
                return response
                    .status(uploadResult.statusCode)
                    .json({ message: uploadResult.message });

            return response.status(201).json({
                message: uploadResult.message,
                data: uploadResult.data,
            });
        } catch (error) {
            console.error(error);
            if (error.httpCode === 413)
                return response.status(413).json({
                    message:
                        'Số lượng tệp hoặc kích thước tệp vượt quá giới hạn.',
                    data: null,
                });

            return response
                .status(500)
                .json({ message: 'Có lỗi xảy ra.', data: null });
        }
    };
}

export default new UserController();
