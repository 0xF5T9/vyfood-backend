/**
 * @file category.ts
 * @description Category models.
 */

'use strict';
import type {
    ResultSetHeader,
    RowDataPacket,
    PoolConnection,
} from 'mysql2/promise';
import { Buffer } from 'buffer';
import path from 'path';
import fs from 'fs/promises';
import formidable from 'formidable';

import { queryTransaction } from '@sources/services/database';
import {
    ModelError,
    ModelResponse,
    getOffset,
    toSlug,
} from '@sources/utility/model';
import pathGlobal from '@sources/global/path';

/**
 * Generate a new unique category slug for insertion.
 * @param connection The mysql pool connection instance.
 * @param categoryName The category name.
 * @returns Returns a unique category slug ready for insertion.
 * @note This function is meant to be called in a transaction context.
 */
async function generateCategorySlug(
    connection: PoolConnection,
    categoryName: string
): Promise<string> {
    let slug = toSlug(categoryName),
        slugGenerateAttempt = 0,
        isDuplicate = true;
    while (isDuplicate) {
        if (slugGenerateAttempt !== 0)
            slug = `${toSlug(categoryName)}-${Math.floor(Math.random() * Date.now())}`;
        if (slugGenerateAttempt === 3)
            throw new ModelError(
                'Có lỗi xảy ra khi cố gắng tạo slug.',
                true,
                500
            );
        const [testNewSlugResult] = await connection.execute<RowDataPacket[]>(
            `SELECT id FROM categories WHERE BINARY slug = ?`,
            [slug]
        );
        isDuplicate = !!testNewSlugResult.length;
        slugGenerateAttempt++;
    }

    return slug;
}

/**
 * Generate category image insertion data.
 * @param imageFile Formidable image file.
 * @returns Returns category image insertion data or null if 'imageFile' argument is null.
 * @note This function is meant to be called in a transaction context.
 * @note This function does not create an image on disk.
 */
async function generateCategoryImageInsertData(
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

    let isCategoryFolderExist;
    try {
        isCategoryFolderExist = await fs.readdir(
            path.join(pathGlobal.upload, 'category')
        );
    } catch (error) {
        isCategoryFolderExist = false;
    }
    if (!isCategoryFolderExist)
        await fs.mkdir(path.join(path.join(pathGlobal.upload, 'category')));

    const tempPath = imageFile.filepath,
        newPath = path.join(
            pathGlobal.upload,
            'category',
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
                'category',
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
 * Get categories.
 * @param page Pagination.
 * @param itemPerPage Item per page.
 * @returns Returns the response object.
 */
async function getCategories(page: number = 1, itemPerPage: number = 99999) {
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
            categories: any;
        }>(async (connection) => {
            const [itemsQueryResult] = await connection.execute<
                    RowDataPacket[]
                >(
                    `SELECT \`slug\`, \`name\`, \`desc\`, \`imageFileName\`, \`priority\` FROM categories LIMIT ?, ?`,
                    [`${offset}`, `${itemPerPage}`]
                ),
                categories = itemsQueryResult || [];

            const [totalItemsQueryResult] = await connection.execute<
                    RowDataPacket[]
                >(`SELECT COUNT(*) AS total_items from categories`),
                totalCategories = (totalItemsQueryResult as any[])[0]
                    .total_items;

            const prevPage = Math.max(1, page - 1),
                nextPage = Math.max(
                    1,
                    Math.min(Math.ceil(totalCategories / itemPerPage), page + 1)
                );

            return {
                meta: {
                    page,
                    itemPerPage,
                    totalItems: totalCategories,
                    isFirstPage: page === 1,
                    isLastPage: page === nextPage,
                    prevPage: `/category?page=${prevPage}&itemPerPage=${itemPerPage}`,
                    nextPage: `/category?page=${nextPage}&itemPerPage=${itemPerPage}`,
                },
                categories: categories,
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
 * Get product counts from categories.
 * @returns Returns the response object.
 */
async function getCategoriesCount() {
    try {
        const transformedCategories = await queryTransaction<
            {
                slug: string;
                count: number;
            }[]
        >(async (connection) => {
            const [getCategorySlugsResult] = await connection.execute<
                Array<RowDataPacket & { slug: string }>
            >(`SELECT \`slug\` FROM \`categories\``);

            return await Promise.all(
                getCategorySlugsResult?.map(async (category) => {
                    const [result] = await connection.execute<
                        Array<RowDataPacket & { slug: string; count: number }>
                    >(
                        `SELECT COUNT(*) AS 'count' FROM \`product_categories\` WHERE category_slug = ?`,
                        [category?.slug]
                    );

                    return { ...category, count: result[0]?.count };
                })
            );
        });

        return new ModelResponse(
            'Truy xuất dữ liệu thành công.',
            true,
            transformedCategories
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
 * Create category.
 * @param name Category name.
 * @param desc Category description.
 * @param priority Category priority.
 * @param image Category image.
 * @returns Returns the response object.
 */
async function createCategory(
    name: string,
    desc: string,
    priority: number,
    image?: formidable.File
) {
    try {
        if (!name || (!priority && priority !== 0))
            throw new ModelError(
                `Thông tin 'name', 'priority' bị thiếu.`,
                false,
                400
            );

        if (image && !image?.mimetype?.includes('image'))
            throw new ModelError(
                'Định dạng tệp không phải là hình ảnh.',
                false,
                400
            );

        priority = Math.max(0, Math.min(priority, 999999));

        await queryTransaction<void>(async (connection) => {
            const categorySlug = await generateCategorySlug(connection, name),
                imageInsertData = await generateCategoryImageInsertData(image);

            const [insertCategoryResult] =
                await connection.execute<ResultSetHeader>(
                    `INSERT INTO categories (\`slug\`, \`name\`, \`desc\`, \`imageFileName\`, \`priority\`) VALUES (?, ?, ?, ?, ?)`,
                    [
                        categorySlug,
                        name,
                        desc,
                        imageInsertData?.fileName || null,
                        `${priority}`,
                    ]
                );
            if (!insertCategoryResult.affectedRows)
                throw new ModelError(
                    'Cập nhật danh mục vào cơ sở dữ liệu thất bại (categories).',
                    true,
                    500
                );

            if (imageInsertData)
                await fs.writeFile(
                    imageInsertData.filePath,
                    imageInsertData.fileRawData
                );
        });

        return new ModelResponse('Tạo danh mục thành công.', true, null);
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
 * Update category.
 * @param slug Category slug id.
 * @param name Category name.
 * @param desc Category description.
 * @param priority Category priority.
 * @returns Returns the response object.
 */
async function updateCategory(
    slug: string,
    name: string,
    desc: string = '',
    priority: number
) {
    try {
        if (!slug || !name || (!priority && priority !== 0))
            throw new ModelError(
                `Thông tin 'slug', 'name', 'priority' bị thiếu.`,
                false,
                400
            );

        priority = Math.max(0, Math.min(priority, 999999));

        await queryTransaction<void>(async (connection) => {
            const categorySlug = await generateCategorySlug(connection, name);

            const [updateCategoryResult] =
                await connection.execute<ResultSetHeader>(
                    `UPDATE categories SET \`slug\` = ?, \`name\` = ?, \`desc\` = ?, \`priority\` = ? WHERE BINARY slug = ?`,
                    [categorySlug, name, desc, `${priority}`, slug]
                );
            if (!updateCategoryResult.affectedRows)
                throw new ModelError(
                    `Không tìm thấy danh mục '${slug}'.`,
                    false,
                    400
                );
        });

        return new ModelResponse('Cập nhật danh mục thành công.', true, null);
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
 * Delete category.
 * @param slug Category slug id.
 * @returns Returns the response object.
 */
async function deleteCategory(slug: string) {
    try {
        if (!slug)
            throw new ModelError(`Thông tin 'slug' bị thiếu.`, false, 400);

        await queryTransaction<void>(async (connection) => {
            const [getCategoryImageResult] = await connection.execute<
                RowDataPacket[]
            >(`SELECT imageFileName FROM categories WHERE BINARY slug = ?`, [
                slug,
            ]);
            if (!getCategoryImageResult.length)
                throw new ModelError(
                    `Không tìm thấy danh mục '${slug}'.`,
                    false,
                    400
                );

            const [deleteCategoryResult] =
                await connection.execute<ResultSetHeader>(
                    `DELETE FROM categories WHERE BINARY slug = ?`,
                    [slug]
                );
            if (!deleteCategoryResult.affectedRows)
                throw new ModelError(
                    'Có lỗi xảy ra khi cố gắng xoá danh mục khỏi cơ sở dữ liệu.',
                    true,
                    500
                );

            const associatedImage =
                    getCategoryImageResult[0].imageFileName /*?.match(
                        /[^\/]+$/
                    )*/,
                associatedImagePath = associatedImage
                    ? path.join(pathGlobal.upload, 'category', associatedImage)
                    : null;

            if (associatedImagePath) await fs.unlink(associatedImagePath);
        });

        return new ModelResponse('Xoá danh mục thành công.', true, null);
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
 * Upload category image.
 * @param slug Category slug.
 * @param image Category image.
 * @returns Returns the response object.
 */
async function uploadCategoryImage(slug: string, image: formidable.File) {
    try {
        if (!slug || !image)
            throw new ModelError(
                `Thông tin 'slug', 'image' bị thiếu.`,
                false,
                400
            );

        if (!image?.mimetype?.includes('image'))
            throw new ModelError(
                'Định dạng tệp không phải là hình ảnh.',
                false,
                400
            );

        await queryTransaction<void>(async (connection) => {
            const [getCategoryFileNameResult] = await connection.execute<
                RowDataPacket[]
            >(`SELECT imageFileName FROM categories WHERE BINARY slug = ?`, [
                slug,
            ]);
            if (!getCategoryFileNameResult.length)
                throw new ModelError(
                    `Không tìm thấy danh mục '${slug}'.`,
                    false,
                    400
                );

            const imageInsertData =
                    await generateCategoryImageInsertData(image),
                newImageFileName = path.parse(imageInsertData.filePath).base;

            const [updateImageFileNameResult] =
                await connection.execute<ResultSetHeader>(
                    `UPDATE categories SET \`imageFileName\` = ? WHERE BINARY slug = ?`,
                    [newImageFileName, slug]
                );
            if (!updateImageFileNameResult.affectedRows)
                throw new ModelError(
                    `Không tìm thấy danh mục '${slug}' khi cập nhật ảnh.`,
                    false,
                    500
                );

            const oldImageFileName =
                getCategoryFileNameResult[0]
                    ?.imageFileName; /*?.match(/[^\/]+$/)[0]*/
            let isOldImageFileExistOnServer;
            try {
                isOldImageFileExistOnServer = await fs.readFile(
                    path.join(pathGlobal.upload, 'category', oldImageFileName)
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
                    path.join(pathGlobal.upload, 'category', oldImageFileName)
            )
                await fs.unlink(
                    path.join(pathGlobal.upload, 'category', oldImageFileName)
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

export default {
    getCategories,
    getCategoriesCount,
    createCategory,
    updateCategory,
    deleteCategory,
    uploadCategoryImage,
};
