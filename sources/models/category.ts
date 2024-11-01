/**
 * @file category.ts
 * @description Category models.
 */

'use strict';
import { Buffer } from 'buffer';
import path from 'path';
import fs from 'fs/promises';
import formidable from 'formidable';

import { query } from '@sources/services/database';
import {
    ModelError,
    ModelResponse,
    getOffset,
    toSlug,
} from '@sources/utility/model';
import pathGlobal from '@sources/global/path';

/**
 * Get categories.
 * @param page Pagination.
 * @param itemPerPage Item per page.
 * @returns Returns the response object.
 */
async function getCategories(page: number = 1, itemPerPage: number = 99999) {
    try {
        const offset = getOffset(page, itemPerPage);

        const itemsQueryResult = await query(
                `SELECT \`slug\`, \`name\`, \`desc\`, \`imageFileName\`, \`priority\` FROM categories LIMIT ?, ?`,
                [`${offset}`, `${itemPerPage}`]
            ),
            categories = itemsQueryResult || [];

        const totalItemsQueryResult = await query(
                `SELECT COUNT(*) AS total_items from categories`
            ),
            totalCategories = (totalItemsQueryResult as any[])[0].total_items;

        const prevPage = Math.max(1, page - 1),
            nextPage = Math.max(
                1,
                Math.min(Math.ceil(totalCategories / itemPerPage), page + 1)
            );

        const meta = {
            page,
            itemPerPage,
            totalItems: totalCategories,
            isFirstPage: page === 1,
            isLastPage: page === nextPage,
            prevPage: `/category?page=${prevPage}&itemPerPage=${itemPerPage}`,
            nextPage: `/category?page=${nextPage}&itemPerPage=${itemPerPage}`,
        };

        return new ModelResponse('Truy xuất dữ liệu thành công.', true, {
            meta,
            categories: categories,
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
 * Get product counts from categories.
 * @returns Returns the response object.
 */
async function getCategoriesCount() {
    try {
        const categoriesResult = (await query(
            `SELECT \`slug\` FROM \`categories\``
        )) as Array<{ slug: string }>;

        let categories = categoriesResult,
            promisesCategories = categories?.map(async (category) => {
                const result = (await query(
                    `SELECT COUNT(*) AS 'count' FROM \`products\` WHERE JSON_UNQUOTE(JSON_SEARCH( \`category\`, 'one', ? )) IS NOT NULL`,
                    [category?.slug]
                )) as any[];

                return { ...category, count: result[0]?.count as string };
            });

        const transformedCategories = await Promise.all(promisesCategories);

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

        priority = Math.max(0, Math.min(priority, 999999));

        let newSlug = toSlug(name),
            slugGenerateAttempt = 0,
            isDuplicate = true;
        while (isDuplicate) {
            if (slugGenerateAttempt !== 0)
                newSlug = `${toSlug(name)}-${Math.floor(Math.random() * Date.now())}`;
            if (slugGenerateAttempt === 3)
                throw new ModelError(
                    'Có lỗi xảy ra khi cố gắng tạo slug.',
                    true,
                    500
                );
            let testNewSlugResult = (await query(
                `SELECT id FROM categories WHERE BINARY slug = ?`,
                [newSlug]
            )) as unknown as any[];
            isDuplicate = !!testNewSlugResult.length;
            slugGenerateAttempt++;
        }

        if (image) {
            if (image && !image?.mimetype?.includes('image'))
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

            let isCategoryFolderExist;
            try {
                isCategoryFolderExist = await fs.readdir(
                    path.join(pathGlobal.upload, 'category')
                );
            } catch (error) {
                isCategoryFolderExist = false;
            }
            if (!isCategoryFolderExist)
                await fs.mkdir(
                    path.join(path.join(pathGlobal.upload, 'category'))
                );

            const tempPath = image.filepath,
                newPath = path.join(
                    pathGlobal.upload,
                    'category',
                    image.originalFilename.replace(/\s/g, '')
                ),
                rawData = await fs.readFile(tempPath),
                fileName = path.parse(
                    image.originalFilename.replace(/\s/g, '')
                ).name,
                fileExt = path.parse(
                    image.originalFilename.replace(/\s/g, '')
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
                        'category',
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
                const insertResult: any = await query(
                    `INSERT INTO categories (\`slug\`, \`name\`, \`desc\`, \`imageFileName\`, \`priority\`) VALUES (?, ?, ?, ?, ?)`,
                    [newSlug, name, desc, imageFileName, `${priority}`]
                );
                if (!insertResult.affectedRows)
                    throw new ModelError(
                        'Cập nhật danh mục vào cơ sở dữ liệu thất bại (categories).',
                        true,
                        500
                    );

                return new ModelResponse(
                    'Tạo danh mục thành công.',
                    true,
                    null
                );
            } catch (error) {
                await fs.unlink(path.join(outputFilePath));

                throw new ModelError(
                    'Cập nhật danh mục vào cơ sở dữ liệu thất bại (categories).',
                    true,
                    500
                );
            }
        } else {
            const insertResult: any = await query(
                `INSERT INTO categories (\`slug\`, \`name\`, \`desc\`, \`priority\`) VALUES (?, ?, ?, ?)`,
                [newSlug, name, desc, `${priority}`]
            );
            if (!insertResult.affectedRows)
                throw new ModelError(
                    'Cập nhật danh mục vào cơ sở dữ liệu thất bại (categories).',
                    true,
                    500
                );

            return new ModelResponse('Tạo danh mục thành công.', true, null);
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

        let newSlug = toSlug(name),
            attempt = 0,
            isDuplicate = true;
        while (isDuplicate && newSlug !== slug) {
            if (attempt !== 0)
                newSlug = `${toSlug(name)}-${Math.floor(Math.random() * Date.now())}`;
            if (attempt === 3)
                throw new ModelError(
                    'Có lỗi xảy ra khi cố gắng tạo slug.',
                    true,
                    500
                );
            let testNewSlugResult = (await query(
                `SELECT id FROM categories WHERE BINARY slug = ?`,
                [newSlug]
            )) as unknown as any[];
            isDuplicate = !!testNewSlugResult.length;
            attempt++;
        }

        const updateResult: any = await query(
            `UPDATE categories SET \`slug\` = ?, \`name\` = ?, \`desc\` = ?, \`priority\` = ? WHERE BINARY slug = ?`,
            [newSlug, name, desc, `${priority}`, slug]
        );
        if (!updateResult.affectedRows)
            throw new ModelError(
                `Không tìm thấy danh mục '${slug}'.`,
                false,
                400
            );

        await query(
            `UPDATE \`products\` SET \`category\` = JSON_SET( \`category\`, JSON_UNQUOTE( JSON_SEARCH( \`category\`, 'one', ? )), ? ) WHERE JSON_UNQUOTE( JSON_SEARCH( \`category\`, 'one', ? )) IS NOT NULL`,
            [slug, newSlug, slug]
        );

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

        const getCategoryImageResult: any = await query(
            `SELECT imageFileName FROM categories WHERE BINARY slug = ?`,
            [slug]
        );
        if (!getCategoryImageResult.length)
            throw new ModelError(
                `Không tìm thấy danh mục '${slug}'.`,
                false,
                400
            );

        await query(
            `UPDATE \`products\` SET \`category\` = JSON_REMOVE(\`category\`, JSON_UNQUOTE(JSON_SEARCH( \`category\`, 'one', ? ))) WHERE JSON_UNQUOTE(JSON_SEARCH( \`category\`, 'one', ? )) IS NOT NULL`,
            [slug, slug]
        );

        const associatedImage =
                getCategoryImageResult[0].imageFileName?.match(/[^\/]+$/)[0],
            associatedImagePath = associatedImage
                ? path.join(pathGlobal.upload, 'category', associatedImage)
                : null;

        const deleteCategoryResult: any = await query(
            `DELETE FROM categories WHERE BINARY slug = ?`,
            [slug]
        );
        if (!deleteCategoryResult.affectedRows)
            throw new ModelError(
                'Có lỗi xảy ra khi cố gắng xoá danh mục khỏi cơ sở dữ liệu.',
                true,
                500
            );

        if (associatedImagePath) {
            try {
                await fs.unlink(associatedImagePath);
            } catch (error) {
                console.error(
                    'Có lỗi xảy ra khi xoá hình ảnh của danh mục.\n',
                    error
                );
            }
        }

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

        const getCategoryFileNameResult: any = await query(
            `SELECT imageFileName FROM categories WHERE BINARY slug = ?`,
            [slug]
        );
        if (!getCategoryFileNameResult.length)
            throw new ModelError(
                `Không tìm thấy danh mục '${slug}'.`,
                false,
                400
            );

        if (!image?.mimetype?.includes('image'))
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

        const tempPath = image.filepath,
            newPath = path.join(
                pathGlobal.upload,
                'category',
                image.originalFilename.replace(/\s/g, '')
            ),
            rawData = await fs.readFile(tempPath),
            fileName = path.parse(
                image.originalFilename.replace(/\s/g, '')
            ).name,
            fileExt = path.parse(image.originalFilename.replace(/\s/g, '')).ext;

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
                    'category',
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
            `UPDATE categories SET \`imageFileName\` = ? WHERE BINARY slug = ?`,
            [newImageFileName, slug]
        );
        if (!updateImageFileNameResult.affectedRows)
            throw new ModelError(
                `Không tìm thấy danh mục '${slug}' khi cập nhật ảnh.`,
                false,
                500
            );

        const oldImageFileName = getCategoryFileNameResult[0],
            parsedOldImageFileName =
                oldImageFileName.imageFileName?.match(/[^\/]+$/)[0];
        let isOldImageFileExistOnServer;
        try {
            isOldImageFileExistOnServer = await fs.readFile(
                path.join(pathGlobal.upload, 'category', parsedOldImageFileName)
            );
        } catch (error) {
            isOldImageFileExistOnServer = null;
        }

        if (
            !!isOldImageFileExistOnServer &&
            outputFilePath !==
                path.join(pathGlobal.upload, 'category', parsedOldImageFileName)
        )
            await fs.unlink(
                path.join(pathGlobal.upload, 'category', parsedOldImageFileName)
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

export default {
    getCategories,
    getCategoriesCount,
    createCategory,
    updateCategory,
    deleteCategory,
    uploadCategoryImage,
};
