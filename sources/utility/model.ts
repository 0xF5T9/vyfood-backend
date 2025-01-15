/**
 * @file model.ts
 * @description Utility classes and functions used by models.
 */

'use strict';
import type { RowDataPacket, PoolConnection } from 'mysql2/promise';
import bcrypt from 'bcrypt';
import slugify from 'slugify';
import staticTexts from '@sources/apis/emart/static-texts';

/**
 * Model error object.
 */
class ModelError extends Error {
    isServerError: boolean;
    statusCode: number;

    /**
     * Constructs a model error object.
     * @param message Error message.
     * @param isServerError Specifies whether a server error has occurred.
     * @param statusCode Specifies a specific http status code for the error.
     * @returns Returns the model error object.
     */
    constructor(message: string, isServerError: boolean, statusCode: number) {
        super(message);
        this.message = message;
        this.isServerError = isServerError;
        this.statusCode = statusCode;
    }
}

/**
 * Model response object.
 */
class ModelResponse {
    message: string;
    success: boolean;
    data: any;
    isServerError: boolean;
    statusCode: number;

    /**
     * Constructs a model response object.
     * @param message Response message.
     * @param success Specifies whether the action is successful.
     * @param data Response associated data.
     * @param isServerError Specifies whether a server error has occurred.
     * @param statusCode Specifies a specific http status code.
     *                                         If not specified, it will be automatically filled in.
     * @returns Returns the model response object.
     */
    constructor(
        message: string,
        success: boolean,
        data: any,
        isServerError: boolean = false,
        statusCode?: number
    ) {
        this.message = message;
        this.success = success;
        this.data = data;
        this.isServerError = isServerError;
        this.statusCode = statusCode
            ? statusCode
            : isServerError
              ? 500
              : success
                ? 200
                : 400;
    }
}

/**
 * Calculates the offset for pagination based
 * on the current page and items per page.
 * @param currentPage Current page.
 * @param itemPerPage Item per page.
 * @returns The calculated offset for pagination.
 */
function getOffset(currentPage: number = 1, itemPerPage: number) {
    return (currentPage - 1) * itemPerPage;
}

/**
 * Check if a string is a valid date format string. (yyyy-mm-dd)
 * @param stringDate Date string.
 * @returns Returns true if the string is a valid date format string, otherwise returns false.
 */
function isValidDate(stringDate: string) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(stringDate)) {
        return false;
    }

    const [year, month, day] = stringDate.split('-').map(Number),
        date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

/**
 * Convert time value in milliseconds to MySQL timestampt format.
 * @param time Time value in milliseconds since midnight of January 1, 1970, UTC.
 * @returns Returns the formatted string.
 */
function toSQLTimestamp(time: number) {
    if (!time) return '';

    const date = new Date(time),
        year = date.getFullYear(),
        month = String(date.getMonth() + 1).padStart(2, '0'),
        day = String(date.getDate()).padStart(2, '0'),
        hours = String(date.getHours()).padStart(2, '0'),
        minutes = String(date.getMinutes()).padStart(2, '0'),
        seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Slugify a string.
 * @param string The string.
 * @param locale Slugify locate. (default: 'vi')
 * @returns Returns the slugified string.
 */
function toSlug(string: string, locale = 'vi') {
    return slugify(string, {
        locale: locale,
        lower: true,
        strict: true,
    });
}

/**
 * Check if username is valid.
 * @param connection The mysql pool connection instance.
 * @param username The username to be checked.
 * @param duplicateCheck Specifies whether to check if the username is already used.
 * @returns Returns true if the username is valid, otherwise returns false.
 * @note This function is meant to be called in a transaction context.
 */
async function validateUsername(
    connection: PoolConnection,
    username: string,
    duplicateCheck: boolean = false
): Promise<boolean> {
    if (!/^[a-z0-9]+$/.test(username))
        throw new ModelError(staticTexts.invalidUsernameCharacters, false, 400);

    if (username.length < 6 || username.length > 16)
        throw new ModelError(staticTexts.invalidUsernameLength, false, 400);

    if (duplicateCheck) {
        const [result] = await connection.execute<
            Array<RowDataPacket & { count: string }>
        >('SELECT COUNT(*) AS `count` FROM users WHERE username = ?', [
            username,
        ]);
        if (!!result[0].count)
            throw new ModelError(staticTexts.usernameAlreadyExist, false, 400);
    }

    return true;
}

/**
 * Check if email is valid.
 * @param connection The mysql pool connection instance.
 * @param email The email to be checked.
 * @param duplicateCheck Specifies whether to check if the email is already used.
 * @returns Returns true if the email is valid, otherwise returns false.
 * @note This function is meant to be called in a transaction context.
 */
async function validateEmail(
    connection: PoolConnection,
    email: string,
    duplicateCheck: boolean = false
): Promise<boolean> {
    if (!/^[a-z0-9](\.?[a-z0-9]){5,}@g(oogle)?mail\.com$/.test(email))
        throw new ModelError(staticTexts.invalidEmail, false, 400);

    if (duplicateCheck) {
        const [result] = await connection.execute<
            Array<RowDataPacket & { count: string }>
        >('SELECT COUNT(*) AS `count` FROM users WHERE email = ?', [email]);
        if (!!result[0].count)
            throw new ModelError(staticTexts.emailAlreadyExist, false, 400);
    }

    return true;
}

/**
 * Check if password is valid.
 * @param password The password to be checked.
 * @returns Returns true if the password is valid, otherwise returns false.
 */
function validatePassword(password: string): boolean {
    if (password.length < 8 || password.length > 32)
        throw new ModelError(staticTexts.invalidPasswordLength, false, 400);

    return true;
}

/**
 * Hash password using bcrypt.
 * @param password Password string.
 * @param saltRounds Salt rounds. (default: 10)
 * @returns Returns the hashed password.
 */
async function hashPassword(
    password: string,
    saltRounds: number = 10
): Promise<string> {
    const salt = await bcrypt.genSalt(saltRounds),
        hashedPassword = await bcrypt.hash(password, salt);

    return hashedPassword;
}

export {
    ModelError,
    ModelResponse,
    getOffset,
    isValidDate,
    toSQLTimestamp,
    toSlug,
    validateUsername,
    validatePassword,
    validateEmail,
    hashPassword,
};
