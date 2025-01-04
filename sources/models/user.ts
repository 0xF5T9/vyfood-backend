/**
 * @file user.ts
 * @description User router models.
 */

'use strict';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { UserUpdateFields } from '@sources/types/user';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import formidable from 'formidable';
import { Buffer } from 'buffer';
import path from 'path';
import fs from 'fs/promises';

import { query, queryTransaction } from '@sources/services/database';
import {
    ModelError,
    ModelResponse,
    getOffset,
    validateUsername,
    validateEmail,
    hashPassword,
    validatePassword,
} from '@sources/utility/model';
import pathGlobal from '@sources/global/path';

/**
 * Generate user avatar image insertion data.
 * @param imageFile Formidable image file.
 * @returns Returns user avatar image insertion data or null if 'imageFile' argument is null.
 * @note This function is meant to be called in a transaction context.
 * @note This function does not create an image on disk.
 */
async function generateUserAvatarImageInsertData(
    imageFile: formidable.File
): Promise<{
    fileName: string;
    filePath: string;
    fileRawData: Buffer;
} | null> {
    if (!imageFile) return null;

    let isUploadFolderExist;
    try {
        isUploadFolderExist = await fs.readdir(pathGlobal.upload);
    } catch (error) {
        isUploadFolderExist = false;
    }
    if (!isUploadFolderExist) await fs.mkdir(path.join(pathGlobal.upload));

    let isUserAvatarFolderExist;
    try {
        isUserAvatarFolderExist = await fs.readdir(
            path.join(pathGlobal.upload, 'avatar')
        );
    } catch (error) {
        isUserAvatarFolderExist = false;
    }
    if (!isUserAvatarFolderExist)
        await fs.mkdir(path.join(path.join(pathGlobal.upload, 'avatar')));

    const tempPath = imageFile.filepath,
        newPath = path.join(
            pathGlobal.upload,
            'avatar',
            imageFile.originalFilename.replace(/\s/g, '')
        ),
        rawData = await fs.readFile(tempPath),
        fileName = path.parse(
            imageFile.originalFilename.replace(/\s/g, '')
        ).name,
        fileExt = path.parse(imageFile.originalFilename.replace(/\s/g, '')).ext;

    let isFileNameAlreadyExist: Buffer | boolean = true,
        fileNameGenerateAttempt = 0,
        outputFilePath = newPath;
    while (isFileNameAlreadyExist) {
        if (fileNameGenerateAttempt === 3)
            throw new ModelError(
                'Có lỗi xảy ra khi cố gắng tạo tên tệp.',
                true,
                500
            );

        try {
            isFileNameAlreadyExist = await fs.readFile(outputFilePath);
            outputFilePath = path.join(
                pathGlobal.upload,
                'avatar',
                `${fileName}-${Math.floor(Math.random() * Date.now())}${fileExt}`
            );
        } catch (error) {
            isFileNameAlreadyExist = null;
        }
        fileNameGenerateAttempt++;
    }

    return {
        fileName: path.parse(outputFilePath).base,
        filePath: outputFilePath,
        fileRawData: rawData,
    };
}

/**
 * Get the user information.
 * @param username Username.
 * @returns Returns the response object.
 */
async function getInfo(username: string) {
    try {
        const getUserInfoResult = await query<RowDataPacket[]>(
            'SELECT username, email, role, avatarFileName, createdAt FROM users WHERE BINARY username = ?',
            [username]
        );
        if (!getUserInfoResult.length)
            throw new ModelError(
                'Không tìm thấy dữ liệu người dùng nào.',
                true,
                500
            );

        return new ModelResponse(
            'Truy xuất dữ liệu người dùng thành công.',
            true,
            getUserInfoResult[0]
        );
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
 * Update user information.
 * @param username Username.
 * @param fields Update fields.
 * @returns Returns the response object.
 */
async function updateInfo(username: string, fields: UserUpdateFields) {
    try {
        const { email } = fields;

        await queryTransaction<void>(async (connection) => {
            if (email) {
                await validateEmail(connection, email, true);

                const [getCurrentUserInfoResult] = await connection.execute<
                    Array<RowDataPacket & { email: string; password: string }>
                >(
                    'SELECT users.email, credentials.password FROM users JOIN credentials ON users.username = credentials.username WHERE BINARY users.username = ?',
                    [username]
                );
                if (!getCurrentUserInfoResult.length)
                    throw new ModelError(
                        'Không thể truy xuất thông tin đăng nhập người dùng.',
                        true,
                        500
                    );
                const currentEmail = getCurrentUserInfoResult[0].email,
                    currentPassword = getCurrentUserInfoResult[0].password;

                const updateEmailToken = jwt.sign(
                    {
                        username,
                        newEmail: email,
                    },
                    `${currentPassword}${currentEmail}`,
                    {
                        expiresIn: '1h',
                    }
                );

                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    host: 'smtp.google.com',
                    port: 465,
                    secure: true,
                    auth: {
                        user: process.env.NODEMAILER_USER,
                        pass: process.env.NODEMAILER_APP_PASSWORD,
                    },
                });

                await transporter.sendMail({
                    from: `no-reply <${process.env.NODEMAILER_USER}>`,
                    to: email,
                    subject: 'Update Email Address',
                    html: `<a href="${process.env.NODEMAILER_DOMAIN}/update-email?token=${updateEmailToken}">Nhấn vào liên kết này để cập nhật địa chỉ email của bạn</a>`,
                });
            }
        });

        return new ModelResponse(
            'Thông tin tài khoản đã được cập nhật thành công.',
            true,
            null
        );
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
 * Update email address.
 * @param token Update email token.
 * @returns Returns the response object.
 */
async function updateEmailAddress(token: string) {
    try {
        if (!token)
            throw new ModelError(
                'Không có token khôi phục nào được cung cấp.',
                false,
                400
            );

        const decoded = jwt.decode(token) as {
            username: string;
            newEmail: string;
        };
        if (!decoded) throw new ModelError('Token không hợp lệ.', false, 401);

        await queryTransaction<void>(async (connection) => {
            const [getCurrentUserInfoResult] = await connection.execute<
                Array<RowDataPacket & { email: string; password: string }>
            >(
                'SELECT users.email, credentials.password FROM users JOIN credentials ON users.username = credentials.username WHERE BINARY users.username = ?',
                [decoded.username]
            );
            if (!getCurrentUserInfoResult.length)
                throw new ModelError(
                    'Không thể truy xuất thông tin đăng nhập người dùng.',
                    true,
                    500
                );

            const currentEmail = getCurrentUserInfoResult[0].email,
                currentPassword = getCurrentUserInfoResult[0].password;

            if (!jwt.verify(token, `${currentPassword}${currentEmail}`))
                throw new ModelError('Token không hợp lệ.', false, 401);

            const [updateEmailResult] =
                await connection.execute<ResultSetHeader>(
                    `UPDATE users SET email = ? WHERE BINARY username = ?`,
                    [decoded.newEmail, decoded.username]
                );
            if (!updateEmailResult.affectedRows)
                throw new ModelError(
                    'Cập nhật địa chỉ email thất bại.',
                    true,
                    500
                );
        });

        return new ModelResponse(
            'Cập nhật địa chỉ email thành công.',
            true,
            null
        );
    } catch (error) {
        if (
            (error?.message as string)
                .toLowerCase()
                .includes('invalid signature')
        )
            return new ModelResponse(
                'Token không hợp lệ.',
                false,
                null,
                false,
                401
            );
        if ((error?.message as string).toLowerCase().includes('expired'))
            return new ModelResponse(
                'Yêu cầu cập nhật này đã hết hạn.',
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
 * Update password.
 * @param username Username.
 * @param currentPassword Current password.
 * @param newPassword New password.
 * @returns Returns the response object.
 */
async function updatePassword(
    username: string,
    currentPassword: string,
    newPassword: string
) {
    try {
        if (!username || !currentPassword || !newPassword)
            throw new ModelError(
                `Thông tin 'username', 'currentPassword', 'newPassword' bị thiếu.`,
                false,
                400
            );

        if (newPassword === currentPassword)
            throw new ModelError(
                'Mật khẩu mới trùng với mật khẩu cũ.',
                false,
                400
            );

        validatePassword(newPassword);

        await queryTransaction<void>(async (connection) => {
            const [getCredentialResult] = await connection.execute<
                RowDataPacket[]
            >('SELECT password FROM credentials WHERE username = ?', [
                username,
            ]);
            if (!getCredentialResult.length)
                throw new ModelError(
                    'Mật khẩu hiện tại không chính xác.',
                    false,
                    401
                );

            const compareResult = await bcrypt.compare(
                currentPassword,
                getCredentialResult[0].password
            );
            if (!compareResult)
                throw new ModelError(
                    'Mật khẩu hiện tại không chính xác.',
                    false,
                    400
                );

            const hashedPassword = await hashPassword(newPassword);

            const [updateCredentialResult] =
                await connection.execute<ResultSetHeader>(
                    `UPDATE credentials SET password = ? WHERE BINARY username = ?`,
                    [hashedPassword, username]
                );
            if (!updateCredentialResult.affectedRows)
                throw new ModelError('Cập nhật mật khẩu thất bại.', true, 500);
        });

        return new ModelResponse('Cập nhật mật khẩu thành công.', true, null);
    } catch (error) {
        if (
            (error?.message as string)
                .toLowerCase()
                .includes('invalid signature')
        )
            return new ModelResponse(
                'Token không hợp lệ.',
                false,
                null,
                false,
                401
            );
        if ((error?.message as string).toLowerCase().includes('expired'))
            return new ModelResponse(
                'Yêu cầu cập nhật này đã hết hạn.',
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
 * Delete user.
 * @param username Username.
 * @param currentPassword Current password.
 * @returns Returns the response object.
 */
async function deleteUser(username: string, currentPassword: string) {
    try {
        if (!username || !currentPassword)
            throw new ModelError(
                `Thông tin 'username', 'currentPassword', 'newPassword' bị thiếu.`,
                false,
                400
            );

        await queryTransaction<void>(async (connection) => {
            const [getCredentialResult] = await connection.execute<
                RowDataPacket[]
            >(`SELECT password FROM credentials WHERE BINARY username = ?`, [
                username,
            ]);
            if (!getCredentialResult?.length)
                throw new ModelError(
                    `Không tìm thấy thông tin credentials của người dùng.`,
                    true,
                    500
                );

            const [getAvatarImageResult] = await connection.execute<
                Array<RowDataPacket & { avatarFileName: string }>
            >(`SELECT avatarFileName FROM users WHERE BINARY username = ?`, [
                username,
            ]);
            if (!getAvatarImageResult.length)
                throw new ModelError(
                    `Không tìm thấy người dùng '${username}'.`,
                    false,
                    400
                );

            const compareResult = await bcrypt.compare(
                currentPassword,
                getCredentialResult[0]?.password
            );
            if (!compareResult)
                throw new ModelError(`Mật khẩu không chính xác.`, false, 400);

            const [deleteCredentialResult] =
                    await connection.execute<ResultSetHeader>(
                        `DELETE FROM credentials WHERE BINARY username = ?`,
                        [username]
                    ),
                [deleteUserResult] = await connection.execute<ResultSetHeader>(
                    `DELETE FROM users WHERE BINARY username = ?`,
                    [username]
                );
            if (
                !deleteCredentialResult?.affectedRows ||
                !deleteUserResult?.affectedRows
            )
                throw new ModelError(
                    `Có lỗi xảy ra khi xoá thông tin người dùng`,
                    true,
                    500
                );

            const associatedImage =
                    getAvatarImageResult[0]
                        .avatarFileName /* ?.match(/[^\/]+$/)[0] */,
                associatedImagePath = associatedImage
                    ? path.join(pathGlobal.upload, 'avatar', associatedImage)
                    : null;

            if (associatedImagePath) {
                try {
                    await fs.unlink(associatedImagePath);
                } catch (error) {
                    console.error(
                        'Có lỗi xảy ra khi xoá hình ảnh avatar của người dùng.\n',
                        error
                    );
                }
            }
        });

        return new ModelResponse('Xoá tài khoản thành công.', true, null);
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
 * Upload user avatar image.
 * @param username Username.
 * @param avatarImage Avatar image.
 * @returns Returns the response object.
 */
async function uploadUserAvatar(
    username: string,
    avatarImage: formidable.File
) {
    try {
        if (!username || !avatarImage)
            throw new ModelError(
                `Thông tin 'username', 'avatarImage' bị thiếu.`,
                false,
                400
            );

        if (!avatarImage?.mimetype?.includes('image'))
            throw new ModelError(
                'Định dạng tệp không phải là hình ảnh.',
                false,
                400
            );

        await queryTransaction<void>(async (connection) => {
            const [getUserAvatarFileNameResult] = await connection.execute<
                Array<RowDataPacket & { avatarFileName: string }>
            >(`SELECT avatarFileName FROM users WHERE BINARY username = ?`, [
                username,
            ]);
            if (!getUserAvatarFileNameResult.length)
                throw new ModelError(
                    `Không tìm thấy người dùng '${username}'.`,
                    false,
                    400
                );

            const imageInsertData =
                    await generateUserAvatarImageInsertData(avatarImage),
                newImageFileName = path.parse(imageInsertData.filePath).base;

            const [updateImageFileNameResult] =
                await connection.execute<ResultSetHeader>(
                    `UPDATE users SET \`avatarFileName\` = ? WHERE BINARY username = ?`,
                    [newImageFileName, username]
                );
            if (!updateImageFileNameResult.affectedRows)
                throw new ModelError(
                    `Không tìm thấy người dùng '${username}' khi cập nhật ảnh avatar.`,
                    false,
                    500
                );

            const oldImageFileName =
                getUserAvatarFileNameResult[0]?.avatarFileName;
            let isOldImageFileExistOnServer;
            try {
                isOldImageFileExistOnServer = await fs.readFile(
                    path.join(pathGlobal.upload, 'avatar', oldImageFileName)
                );
            } catch (error) {
                isOldImageFileExistOnServer = null;
            }

            await fs.writeFile(
                imageInsertData.filePath,
                imageInsertData.fileRawData
            );

            if (
                !!isOldImageFileExistOnServer &&
                imageInsertData.filePath !==
                    path.join(pathGlobal.upload, 'avatar', oldImageFileName)
            )
                await fs.unlink(
                    path.join(pathGlobal.upload, 'avatar', oldImageFileName)
                );
        });

        return new ModelResponse('Tải hình ảnh thành công.', true, null);
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
 * Get users as admin.
 * @param page Pagination.
 * @param itemPerPage Item per page.
 * @returns Returns the response object.
 */
async function getUsersAsAdmin(page: number = 1, itemPerPage: number = 12) {
    try {
        const offset = getOffset(page, itemPerPage);

        const result = await queryTransaction<{
            meta: {
                page: number;
                itemPerPage: number;
                totalItems: any;
                isFirstPage: boolean;
                isLastPage: boolean;
                prevPage: string;
                nextPage: string;
            };
            users: any;
        }>(async (connection) => {
            const [getUsersResult] = await connection.execute<RowDataPacket[]>(
                    `SELECT username, email, role, avatarFileName, createdAt FROM users LIMIT ?, ?`,
                    [`${offset}`, `${itemPerPage}`]
                ),
                users = getUsersResult;

            const [totalItemsQueryResult] = await connection.execute<
                    Array<RowDataPacket & { total_items: number }>
                >(`SELECT COUNT(*) AS total_items from users`),
                totalUsers = totalItemsQueryResult[0].total_items;

            const prevPage = Math.max(1, page - 1),
                nextPage = Math.max(
                    1,
                    Math.min(Math.ceil(totalUsers / itemPerPage), page + 1)
                );

            const meta = {
                page,
                itemPerPage,
                totalItems: totalUsers,
                isFirstPage: page === 1,
                isLastPage: page === nextPage,
                prevPage: `/user?page=${prevPage}&itemPerPage=${itemPerPage}`,
                nextPage: `/user?page=${nextPage}&itemPerPage=${itemPerPage}`,
            };

            return {
                meta,
                users,
            };
        });

        return new ModelResponse('Truy xuất dữ liệu thành công.', true, result);
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
 * Create an user as admin.
 * @param email Email.
 * @param username Username.
 * @param password Password.
 * @param role Role.
 * @param avatarImage Avatar image.
 * @returns Returns the response object.
 */
async function createUserAsAdmin(
    email: string,
    username: string,
    password: string,
    role: string,
    avatarImage?: formidable.File
) {
    try {
        if (!email || !username || !password || !role)
            throw new ModelError(
                `Thông tin 'email', 'username', 'password', 'role' bị thiếu.`,
                false,
                400
            );

        if (avatarImage && !avatarImage?.mimetype?.includes('image'))
            throw new ModelError(
                'Định dạng tệp không phải là hình ảnh.',
                false,
                400
            );

        await queryTransaction<void>(async (connection) => {
            if (
                !(await validateUsername(connection, username, true)) ||
                !validatePassword(password) ||
                !(await validateEmail(connection, email, true))
            )
                throw new ModelError(
                    'Thông tin đăng ký không hợp lệ.',
                    false,
                    400
                );

            const hashedPassword = await hashPassword(password),
                imageInsertData =
                    await generateUserAvatarImageInsertData(avatarImage);

            const [insertUserResult] =
                await connection.execute<ResultSetHeader>(
                    `INSERT INTO \`users\` (\`username\`, \`email\`, \`role\`, \`avatarFileName\`) VALUES (?, ?, ?, ?)`,
                    [username, email, role, imageInsertData?.fileName || null]
                );
            if (!insertUserResult.affectedRows)
                throw new ModelError(
                    'Cập nhật người dùng vào cơ sở dữ liệu thất bại (users).',
                    true,
                    500
                );

            const [insertCredentialsResult] =
                await connection.execute<ResultSetHeader>(
                    `INSERT INTO \`credentials\` (\`password\`, \`username\`) VALUES (?, ?)`,
                    [hashedPassword, username]
                );
            if (!insertCredentialsResult.affectedRows)
                throw new ModelError(
                    'Cập nhật người dùng vào cơ sở dữ liệu thất bại (credentials).',
                    true,
                    500
                );

            if (imageInsertData)
                await fs.writeFile(
                    imageInsertData.filePath,
                    imageInsertData.fileRawData
                );
        });

        return new ModelResponse('Tạo người dùng thành công.', true, null);
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
 * Update user as admin.
 * @param email Email.
 * @param username Username.
 * @param password Password.
 * @param role Role.
 * @returns Returns the response object.
 */
async function updateUserAsAdmin(
    targetUsername: string,
    email?: string,
    username?: string,
    password?: string,
    role?: string
) {
    try {
        if (!targetUsername)
            throw new ModelError(
                `Thông tin 'targetUsername' bị thiếu.`,
                false,
                400
            );

        await queryTransaction<void>(async (connection) => {
            const [getCurrentUserInfoResult] = await connection.execute<
                Array<
                    RowDataPacket & {
                        username: string;
                        email: string;
                        role: string;
                    }
                >
            >(
                'SELECT username, email, role FROM `users` WHERE BINARY username = ?',
                [targetUsername]
            );
            if (!getCurrentUserInfoResult.length)
                throw new ModelError(
                    `Không tìm thấy người dùng '${targetUsername}'`,
                    false,
                    400
                );

            const currentUsername = getCurrentUserInfoResult[0].username,
                currentEmail = getCurrentUserInfoResult[0].email,
                currentRole = getCurrentUserInfoResult[0].role;

            if (email && email !== currentEmail) {
                if (!(await validateEmail(connection, email, false)))
                    throw new ModelError(
                        'Thông tin cập nhật không hợp lệ.',
                        false,
                        400
                    );
                const [checkDuplicateResult] = await connection.execute<
                    Array<RowDataPacket & { count: number }>
                >(
                    'SELECT COUNT(*) as count FROM users WHERE BINARY email = ?',
                    [email]
                );
                if (checkDuplicateResult[0].count)
                    throw new ModelError(
                        'Địa chỉ email này đã tồn tại.',
                        false,
                        400
                    );
            }

            if (username && username !== currentUsername) {
                if (!(await validateUsername(connection, username, false)))
                    throw new ModelError(
                        'Thông tin cập nhật không hợp lệ.',
                        false,
                        400
                    );
                const [checkDuplicateResult] = await connection.execute<
                    Array<RowDataPacket & { count: number }>
                >(
                    'SELECT COUNT(*) as count FROM users WHERE BINARY username = ?',
                    [username]
                );
                if (checkDuplicateResult[0].count)
                    throw new ModelError(
                        'Tên người dùng này đã tồn tại.',
                        false,
                        400
                    );
            }

            const [updateUserResult] =
                await connection.execute<ResultSetHeader>(
                    `UPDATE \`users\` SET \`username\` = ?, \`email\` = ?, \`role\` = ? WHERE BINARY \`username\` = ?`,
                    [
                        username || currentUsername,
                        email || currentEmail,
                        role || currentRole,
                        targetUsername,
                    ]
                );
            if (!updateUserResult.affectedRows)
                throw new ModelError(
                    'Cập nhật người dùng thất bại (users).',
                    true,
                    500
                );

            if (password) {
                if (!validatePassword(password))
                    throw new ModelError(
                        'Thông tin cập nhật không hợp lệ.',
                        false,
                        400
                    );

                const hashedPassword = await hashPassword(password);

                const [updateCredentialsResult] =
                    await connection.execute<ResultSetHeader>(
                        `UPDATE \`credentials\` SET \`password\` = ? WHERE BINARY username = ?`,
                        [hashedPassword, username || currentUsername]
                    );
                if (!updateCredentialsResult.affectedRows)
                    throw new ModelError(
                        'Cập nhật người dùng thất bại (credentials).',
                        true,
                        500
                    );
            }
        });

        return new ModelResponse('Cập nhật người dùng thành công.', true, null);
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
 * Delete user as admin.
 * @param username Username.
 * @returns Returns the response object.
 */
async function deleteUserAsAdmin(username: string) {
    try {
        if (!username)
            throw new ModelError(`Thông tin 'username' bị thiếu.`, false, 400);

        await queryTransaction<void>(async (connection) => {
            const [getAvatarImageResult] = await connection.execute<
                Array<
                    RowDataPacket & {
                        avatarFileName: string;
                    }
                >
            >(`SELECT avatarFileName FROM users WHERE BINARY username = ?`, [
                username,
            ]);
            if (!getAvatarImageResult.length)
                throw new ModelError(
                    `Không tìm thấy người dùng '${username}'.`,
                    false,
                    400
                );

            const [deleteCredentialResult] =
                    await connection.execute<ResultSetHeader>(
                        `DELETE FROM credentials WHERE BINARY username = ?`,
                        [username]
                    ),
                [deleteUserResult] = await connection.execute<ResultSetHeader>(
                    `DELETE FROM users WHERE BINARY username = ?`,
                    [username]
                );
            if (
                !deleteCredentialResult?.affectedRows ||
                !deleteUserResult?.affectedRows
            )
                throw new ModelError(
                    `Có lỗi xảy ra khi xoá thông tin người dùng`,
                    true,
                    500
                );

            const associatedImage =
                    getAvatarImageResult[0]
                        .avatarFileName /* ?.match(/[^\/]+$/)[0] */,
                associatedImagePath = associatedImage
                    ? path.join(pathGlobal.upload, 'avatar', associatedImage)
                    : null;

            if (associatedImagePath) {
                try {
                    await fs.unlink(associatedImagePath);
                } catch (error) {
                    console.error(
                        'Có lỗi xảy ra khi xoá hình ảnh avatar của người dùng.\n',
                        error
                    );
                }
            }
        });

        return new ModelResponse('Xoá người dùng thành công.', true, null);
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

export default {
    getInfo,
    updateInfo,
    updateEmailAddress,
    updatePassword,
    deleteUser,
    uploadUserAvatar,
    getUsersAsAdmin,
    createUserAsAdmin,
    updateUserAsAdmin,
    deleteUserAsAdmin,
};
