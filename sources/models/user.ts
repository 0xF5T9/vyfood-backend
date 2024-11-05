/**
 * @file user.ts
 * @description User router models.
 */

'use strict';
import type { UserUpdateFields } from '@sources/types/user';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import formidable from 'formidable';
import { Buffer } from 'buffer';
import path from 'path';
import fs from 'fs/promises';

import { query, queryTransaction } from '@sources/services/database';
import { ModelError, ModelResponse, getOffset } from '@sources/utility/model';
import pathGlobal from '@sources/global/path';

/**
 * Hash password using bcrypt.
 * @param password Password string.
 * @param saltRounds Salt rounds. (default: 10)
 * @returns Returns the response object.
 */
async function hashPassword(password: string, saltRounds: number = 10) {
    try {
        const salt = await bcrypt.genSalt(saltRounds),
            hashedPassword = await bcrypt.hash(password, salt);

        return new ModelResponse('Băm mật khẩu thành công.', true, {
            generatedSalt: salt,
            hashedPassword,
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
 * Get the user information.
 * @param username Username.
 * @returns Returns the response object.
 */
async function getInfo(username: string) {
    try {
        const sql = `SELECT username, email, role, avatarFileName, createdAt FROM users WHERE username = ?`;

        const result: any = await query(sql, [username]);
        if (!!!result.length)
            throw new ModelError(
                'Không tìm thấy dữ liệu người dùng nào.',
                true,
                500
            );

        const userInfo = result[0];

        return new ModelResponse(
            'Truy xuất dữ liệu người dùng thành công.',
            true,
            userInfo
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

        // Update email.
        if (email) {
            if (!/^[a-z0-9](\.?[a-z0-9]){5,}@g(oogle)?mail\.com$/.test(email))
                throw new ModelError(
                    'Địa chỉ email mới không hợp lệ (Chỉ hỗ trợ Gmail).',
                    false,
                    400
                );

            const emailResult = (await query(
                `SELECT id FROM users WHERE email = ?`,
                [email]
            )) as any[];
            if (emailResult.length)
                throw new ModelError(
                    'Địa chỉ email này đã tồn tại.',
                    false,
                    400
                );

            const credentialResult = (await query(
                `SELECT * FROM credentials WHERE username = ?`,
                [username]
            )) as any[];
            if (!!!credentialResult.length)
                throw new ModelError(
                    'Không thể truy xuất thông tin đăng nhập người dùng.',
                    true,
                    500
                );

            const currentEmailResult = (await query(
                `SELECT email FROM users WHERE username = ?`,
                [username]
            )) as any[];
            if (!!!currentEmailResult.length)
                throw new ModelError(
                    'Không thể truy xuất thông tin email người dùng.',
                    true,
                    500
                );

            const { password } = credentialResult[0],
                updateEmailToken = jwt.sign(
                    {
                        username,
                        newEmail: email,
                    },
                    `${password}${currentEmailResult[0]?.email}`,
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
                html: `<a href="${process.env.NODEMAILER_DOMAIN}">Nhấn vào liên kết này để cập nhật địa chỉ email của bạn</a>`,
            });
        }

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

        const credentialResult: any = await query(
            `SELECT * FROM credentials WHERE username = ?`,
            [decoded.username]
        );
        if (!!!credentialResult.length)
            throw new ModelError(
                'Không thể truy xuất thông tin đăng nhập người dùng.',
                true,
                500
            );

        const currentEmailResult = (await query(
            `SELECT email FROM users WHERE username = ?`,
            [decoded.username]
        )) as any[];
        if (!!!currentEmailResult.length)
            throw new ModelError(
                'Không thể truy xuất thông tin email người dùng.',
                true,
                500
            );

        if (
            !jwt.verify(
                token,
                `${credentialResult[0].password}${currentEmailResult[0]?.email}`
            )
        )
            throw new ModelError('Token không hợp lệ.', false, 401);

        const updateResult: any = await query(
            `UPDATE users SET email = ? WHERE username = ?`,
            [decoded.newEmail, decoded.username]
        );
        if (!updateResult.affectedRows)
            throw new ModelError('Cập nhật địa chỉ email thất bại.', true, 500);

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

        if (newPassword.length < 8 || newPassword.length > 32)
            throw new ModelError(
                'Mật khẩu phải có tối thiểu 8 ký tự và tối đa 32 ký tự.',
                false,
                400
            );

        const credentialsSql = `SELECT c.username, c.password, u.email, u.role
            FROM credentials c JOIN users u 
            ON c.username = u.username 
            WHERE c.username = ?`;

        const credentialsResult = (await query(credentialsSql, [
            username,
        ])) as any[];
        if (!!!credentialsResult.length)
            throw new ModelError(
                'Mật khẩu hiện tại không chính xác.',
                false,
                401
            );

        const compareResult = await bcrypt.compare(
            currentPassword,
            credentialsResult[0].password
        );
        if (!compareResult)
            throw new ModelError(
                'Mật khẩu hiện tại không chính xác.',
                false,
                400
            );

        const hashResult = await hashPassword(newPassword);
        if (!hashResult.success)
            throw new ModelError(hashResult.message, true, 500);

        const updateResult: any = await query(
            `UPDATE credentials SET password = ? WHERE username = ?`,
            [hashResult.data.hashedPassword, username]
        );
        if (!updateResult.affectedRows)
            throw new ModelError('Cập nhật mật khẩu thất bại.', true, 500);

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

        const credentialResult = (await query(
            `SELECT password FROM credentials WHERE username = ?`,
            [username]
        )) as any[];
        if (!!!credentialResult?.length)
            throw new ModelError(
                `Không tìm thấy thông tin credentials của username.`,
                true,
                500
            );

        const compareResult = await bcrypt.compare(
            currentPassword,
            credentialResult[0]?.password
        );
        if (!compareResult)
            throw new ModelError(`Mật khẩu không chính xác.`, false, 400);

        const getAvatarImageResult: any = await query(
            `SELECT avatarFileName FROM users WHERE username = ?`,
            [username]
        );
        if (!getAvatarImageResult.length)
            throw new ModelError(
                `Không tìm thấy người dùng '${username}'.`,
                false,
                400
            );

        const associatedImage =
                getAvatarImageResult[0].avatarFileName?.match(/[^\/]+$/)[0],
            associatedImagePath = associatedImage
                ? path.join(pathGlobal.upload, 'avatar', associatedImage)
                : null;

        const deleteCredentialResult: any = await query(
                `DELETE FROM credentials WHERE username = ?`,
                [username]
            ),
            deleteUserResult: any = await query(
                `DELETE FROM users WHERE username = ?`,
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
 * Upload user avatar image as admin
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

        const getUserAvatarFileNameResult: any = await query(
            `SELECT avatarFileName FROM users WHERE BINARY username = ?`,
            [username]
        );
        if (!getUserAvatarFileNameResult.length)
            throw new ModelError(
                `Không tìm thấy người dùng '${username}'.`,
                false,
                400
            );

        if (!avatarImage?.mimetype?.includes('image'))
            throw new ModelError(
                'Định dạng tệp không phải là hình ảnh.',
                false,
                400
            );

        let isUploadFolderExist;
        try {
            isUploadFolderExist = await fs.readdir(pathGlobal.upload);
        } catch (error) {
            isUploadFolderExist = false;
        }
        if (!isUploadFolderExist) await fs.mkdir(path.join(pathGlobal.upload));

        let isAvatarFolderExist;
        try {
            isAvatarFolderExist = await fs.readdir(
                path.join(pathGlobal.upload, 'avatar')
            );
        } catch (error) {
            isAvatarFolderExist = false;
        }
        if (!isAvatarFolderExist)
            await fs.mkdir(path.join(path.join(pathGlobal.upload, 'avatar')));

        const tempPath = avatarImage.filepath,
            newPath = path.join(
                pathGlobal.upload,
                'avatar',
                avatarImage.originalFilename.replace(/\s/g, '')
            ),
            rawData = await fs.readFile(tempPath),
            fileName = path.parse(
                avatarImage.originalFilename.replace(/\s/g, '')
            ).name,
            fileExt = path.parse(
                avatarImage.originalFilename.replace(/\s/g, '')
            ).ext;

        let isFileNameAlreadyExist: Buffer | boolean = true,
            attempt = 0,
            outputFilePath = newPath;
        while (isFileNameAlreadyExist) {
            if (attempt === 3)
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
            attempt++;
        }

        await fs.writeFile(outputFilePath, rawData);
        const newImageFileName = path.parse(outputFilePath).base;
        const updateImageFileNameResult: any = await query(
            `UPDATE users SET \`avatarFileName\` = ? WHERE BINARY username = ?`,
            [newImageFileName, username]
        );
        if (!updateImageFileNameResult.affectedRows)
            throw new ModelError(
                `Không tìm thấy người dùng '${username}' khi cập nhật ảnh avatar.`,
                false,
                500
            );

        const oldImageFileName = getUserAvatarFileNameResult[0],
            parsedOldImageFileName =
                oldImageFileName.avatarFileName?.match(/[^\/]+$/)[0];
        let isOldImageFileExistOnServer;
        try {
            isOldImageFileExistOnServer = await fs.readFile(
                path.join(pathGlobal.upload, 'avatar', parsedOldImageFileName)
            );
        } catch (error) {
            isOldImageFileExistOnServer = null;
        }

        if (
            !!isOldImageFileExistOnServer &&
            outputFilePath !==
                path.join(pathGlobal.upload, 'avatar', parsedOldImageFileName)
        )
            await fs.unlink(
                path.join(pathGlobal.upload, 'avatar', parsedOldImageFileName)
            );

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

        const itemsQueryResult = await query(
                `SELECT username, email, role, avatarFileName, createdAt FROM users LIMIT ?, ?`,
                [`${offset}`, `${itemPerPage}`]
            ),
            users = itemsQueryResult || [];

        const totalItemsQueryResult = await query(
                `SELECT COUNT(*) AS total_items from users`
            ),
            totalUsers = (totalItemsQueryResult as any[])[0].total_items;

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

        return new ModelResponse('Truy xuất dữ liệu thành công.', true, {
            meta,
            users,
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

        if (!/^[a-z0-9](\.?[a-z0-9]){5,}@g(oogle)?mail\.com$/.test(email))
            throw new ModelError(
                'Địa chỉ email không hợp lệ (Chỉ hỗ trợ Gmail).',
                false,
                400
            );

        if (!/^[a-zA-Z0-9]+$/.test(username))
            throw new ModelError(
                'Tên tài khoản chứa ký tự không hợp lệ [a-zA-Z0-9].',
                false,
                400
            );

        if (username.length < 6 || username.length > 16)
            throw new ModelError(
                'Tên tài khoản phải có tối thiểu 6 ký tự và tối đa 16 ký tự.',
                false,
                400
            );

        if (password.length < 8 || password.length > 32)
            throw new ModelError(
                'Mật khẩu phải có tối thiểu 8 ký tự và tối đa 32 ký tự.',
                false,
                400
            );

        const { data: hashResult } = await hashPassword(password),
            hashedPassword = hashResult.hashedPassword;

        if (avatarImage) {
            if (avatarImage && !avatarImage?.mimetype?.includes('image'))
                throw new ModelError(
                    'Định dạng tệp không phải là hình ảnh.',
                    false,
                    400
                );

            let isUploadFolderExist;
            try {
                isUploadFolderExist = await fs.readdir(pathGlobal.upload);
            } catch (error) {
                isUploadFolderExist = false;
            }
            if (!isUploadFolderExist)
                await fs.mkdir(path.join(pathGlobal.upload));

            let isAvatarFolderExist;
            try {
                isAvatarFolderExist = await fs.readdir(
                    path.join(pathGlobal.upload, 'avatar')
                );
            } catch (error) {
                isAvatarFolderExist = false;
            }
            if (!isAvatarFolderExist)
                await fs.mkdir(
                    path.join(path.join(pathGlobal.upload, 'avatar'))
                );

            const tempPath = avatarImage.filepath,
                newPath = path.join(
                    pathGlobal.upload,
                    'avatar',
                    avatarImage.originalFilename.replace(/\s/g, '')
                ),
                rawData = await fs.readFile(tempPath),
                fileName = path.parse(
                    avatarImage.originalFilename.replace(/\s/g, '')
                ).name,
                fileExt = path.parse(
                    avatarImage.originalFilename.replace(/\s/g, '')
                ).ext;

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

            await fs.writeFile(outputFilePath, rawData);

            const imageFileName = path.parse(outputFilePath).base;
            try {
                await queryTransaction(async (connection) => {
                    const [usernameDuplicateResult] = (await connection.execute(
                        `SELECT id FROM \`users\` WHERE username = ?`,
                        [username]
                    )) as Array<any>;
                    if (usernameDuplicateResult.length)
                        throw new ModelError(
                            'Tên người dùng này đã tồn tại.',
                            false,
                            400
                        );

                    const [emailDuplicateResult] = (await connection.execute(
                        `SELECT id FROM \`users\` WHERE email = ?`,
                        [email]
                    )) as Array<any>;
                    if (emailDuplicateResult.length)
                        throw new ModelError(
                            'Địa chỉ email này đã tồn tại.',
                            false,
                            400
                        );

                    const [insertUserResult] = (await connection.execute(
                        `INSERT INTO \`users\` (\`username\`, \`email\`, \`role\`, \`avatarFileName\`) VALUES (?, ?, ?, ?)`,
                        [username, email, role, imageFileName]
                    )) as Array<any>;
                    if (!insertUserResult.affectedRows)
                        throw new ModelError(
                            'Cập nhật người dùng vào cơ sở dữ liệu thất bại (users).',
                            true,
                            500
                        );

                    const [insertCredentialsResult] = (await connection.execute(
                        `INSERT INTO \`credentials\` (\`password\`, \`username\`) VALUES (?, ?)`,
                        [hashedPassword, username]
                    )) as Array<any>;
                    if (!insertCredentialsResult.affectedRows)
                        throw new ModelError(
                            'Cập nhật người dùng vào cơ sở dữ liệu thất bại (credentials).',
                            true,
                            500
                        );
                    return insertCredentialsResult;
                });

                return new ModelResponse(
                    'Tạo người dùng thành công.',
                    true,
                    null
                );
            } catch (error) {
                await fs.unlink(path.join(outputFilePath));

                throw new ModelError(
                    'Thêm người dùng vào cơ sở dữ liệu thất bại (users).',
                    true,
                    500
                );
            }
        } else {
            await queryTransaction(async (connection) => {
                const [usernameDuplicateResult] = (await connection.execute(
                    `SELECT id FROM \`users\` WHERE BINARY username = ?`,
                    [username]
                )) as Array<any>;
                if (usernameDuplicateResult.length)
                    throw new ModelError(
                        'Tên người dùng này đã tồn tại.',
                        false,
                        400
                    );

                const [emailDuplicateResult] = (await connection.execute(
                    `SELECT id FROM \`users\` WHERE BINARY email = ?`,
                    [email]
                )) as Array<any>;
                if (emailDuplicateResult.length)
                    throw new ModelError(
                        'Địa chỉ email này đã tồn tại.',
                        false,
                        400
                    );

                const [insertUserResult] = (await connection.execute(
                    `INSERT INTO \`users\` (\`username\`, \`email\`, \`role\`) VALUES (?, ?, ?)`,
                    [username, email, role]
                )) as Array<any>;
                if (!insertUserResult.affectedRows)
                    throw new ModelError(
                        'Cập nhật người dùng vào cơ sở dữ liệu thất bại (users).',
                        true,
                        500
                    );

                const [insertCredentialsResult] = (await connection.execute(
                    `INSERT INTO \`credentials\` (\`password\`, \`username\`) VALUES (?, ?)`,
                    [hashedPassword, username]
                )) as Array<any>;
                if (!insertCredentialsResult.affectedRows)
                    throw new ModelError(
                        'Cập nhật người dùng vào cơ sở dữ liệu thất bại (credentials).',
                        true,
                        500
                    );
                return insertCredentialsResult;
            });

            return new ModelResponse('Tạo người dùng thành công.', true, null);
        }
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

        if (
            email &&
            !/^[a-z0-9](\.?[a-z0-9]){5,}@g(oogle)?mail\.com$/.test(email)
        )
            throw new ModelError(
                'Địa chỉ email không hợp lệ (Chỉ hỗ trợ Gmail).',
                false,
                400
            );

        if (username && !/^[a-zA-Z0-9]+$/.test(username))
            throw new ModelError(
                'Tên tài khoản chứa ký tự không hợp lệ [a-zA-Z0-9].',
                false,
                400
            );

        if (
            (username && username.length < 6) ||
            (username && username.length > 16)
        )
            throw new ModelError(
                'Tên tài khoản phải có tối thiểu 6 ký tự và tối đa 16 ký tự.',
                false,
                400
            );

        if (
            (password && password.length < 8) ||
            (password && password.length > 32)
        )
            throw new ModelError(
                'Mật khẩu phải có tối thiểu 8 ký tự và tối đa 32 ký tự.',
                false,
                400
            );

        let hashedPassword: string;
        if (password) {
            const { data: hashResult } = await hashPassword(password);
            hashedPassword = hashResult.hashedPassword;
        }

        await queryTransaction(async (connection) => {
            const [currentUserResult] = (await connection.execute(
                `SELECT * FROM \`users\` WHERE BINARY username = ?`,
                [targetUsername]
            )) as Array<any>;
            if (!currentUserResult.length)
                throw new ModelError(
                    `Không tìm thấy người dùng '${targetUsername}'`,
                    false,
                    400
                );

            if (username && currentUserResult[0].username !== username) {
                const [usernameDuplicateResult] = (await connection.execute(
                    `SELECT id FROM \`users\` WHERE BINARY username = ?`,
                    [username]
                )) as Array<any>;
                if (usernameDuplicateResult.length)
                    throw new ModelError(
                        'Tên người dùng này đã tồn tại.',
                        false,
                        400
                    );
            }

            if (email && currentUserResult[0].email !== email) {
                const [emailDuplicateResult] = (await connection.execute(
                    `SELECT id FROM \`users\` WHERE BINARY email = ?`,
                    [email]
                )) as Array<any>;
                if (emailDuplicateResult.length)
                    throw new ModelError(
                        'Địa chỉ email này đã tồn tại.',
                        false,
                        400
                    );
            }

            const [updateUserResult] = (await connection.execute(
                `UPDATE \`users\` SET \`username\` = ?, \`email\` = ?, \`role\` = ? WHERE BINARY \`username\` = ?`,
                [
                    username || currentUserResult[0].username,
                    email || currentUserResult[0].email,
                    role || currentUserResult[0].role,
                    targetUsername,
                ]
            )) as Array<any>;
            if (!updateUserResult.affectedRows)
                throw new ModelError(
                    'Cập nhật người dùng thất bại (users).',
                    true,
                    500
                );

            if (password) {
                const [updateCredentialsResult] = (await connection.execute(
                    `UPDATE \`credentials\` SET \`password\` = ? WHERE BINARY username = ?`,
                    [hashedPassword, username]
                )) as Array<any>;
                if (!updateCredentialsResult.affectedRows)
                    throw new ModelError(
                        'Cập nhật người dùng thất bại (credentials).',
                        true,
                        500
                    );
            }

            return updateUserResult;
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

        const getAvatarImageResult: any = await query(
            `SELECT avatarFileName FROM users WHERE BINARY username = ?`,
            [username]
        );
        if (!getAvatarImageResult.length)
            throw new ModelError(
                `Không tìm thấy người dùng '${username}'.`,
                false,
                400
            );

        const associatedImage =
                getAvatarImageResult[0].avatarFileName?.match(/[^\/]+$/)[0],
            associatedImagePath = associatedImage
                ? path.join(pathGlobal.upload, 'avatar', associatedImage)
                : null;

        const deleteCredentialResult: any = await query(
                `DELETE FROM credentials WHERE username = ?`,
                [username]
            ),
            deleteUserResult: any = await query(
                `DELETE FROM users WHERE username = ?`,
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
