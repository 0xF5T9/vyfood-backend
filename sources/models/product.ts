/**
 * @file product.ts
 * @description Product router models.
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
 * Get products.
 * @param page Pagination.
 * @param itemPerPage Item per page.
 * @returns Returns the response object.
 */
async function getProducts(page: number = 1, itemPerPage: number = 12) {
    try {
        const offset = getOffset(page, itemPerPage);

        const itemsQueryResult = await query(
                `SELECT slug, \`name\`, category, \`desc\`, price, imageFileName, priority FROM products LIMIT ?, ?`,
                [`${offset}`, `${itemPerPage}`]
            ),
            products = itemsQueryResult || [];

        const totalItemsQueryResult = await query(
                `SELECT COUNT(*) AS total_items from products`
            ),
            totalProducts = (totalItemsQueryResult as any[])[0].total_items;

        const prevPage = Math.max(1, page - 1),
            nextPage = Math.max(
                1,
                Math.min(Math.ceil(totalProducts / itemPerPage), page + 1)
            );

        const meta = {
            page,
            itemPerPage,
            totalItems: totalProducts,
            isFirstPage: page === 1,
            isLastPage: page === nextPage,
            prevPage: `/product?page=${prevPage}&itemPerPage=${itemPerPage}`,
            nextPage: `/product?page=${nextPage}&itemPerPage=${itemPerPage}`,
        };

        return new ModelResponse('Truy xuất dữ liệu thành công.', true, {
            meta,
            products,
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
 * Create product.
 * @param name Product name.
 * @param categories Product categories.
 * @param desc Product description.
 * @param price Product price.
 * @param priority Product priority.
 * @param image Product image.
 * @returns Returns the response object.
 */
async function createProduct(
    name: string,
    categories: string,
    desc: string,
    price: number,
    priority: number,
    image?: formidable.File
) {
    try {
        if (!name || (!price && price !== 0) || (!priority && priority !== 0))
            throw new ModelError(
                `Thông tin 'name', 'price', 'priority' bị thiếu.`,
                false,
                400
            );

        priority = Math.max(0, Math.min(priority, 2147483647));
        price = Math.max(0, Math.min(price, 2147483647));

        let transformedCategories: string[];
        if (categories) {
            transformedCategories = categories?.split(',');
            const categoryResult = (await query(
                    `SELECT slug FROM categories`
                )) as any[],
                currentCategories = categoryResult.map(
                    (category) => category?.slug
                );
            let isInvalidCategory = false;
            transformedCategories?.every((itemCategory) => {
                if (!currentCategories?.includes(itemCategory)) {
                    isInvalidCategory = true;
                    return false;
                }
                return true;
            });
            if (isInvalidCategory)
                throw new ModelError('Danh mục không hợp lệ.', false, 400);
        }
        let insertCategories = transformedCategories
            ? `[${transformedCategories?.map((categoryValue) => `"${categoryValue}"`)?.join(',')}]`
            : '[]';

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
                `SELECT id FROM products WHERE BINARY slug = ?`,
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

            let isProductFolderExist;
            try {
                isProductFolderExist = await fs.readdir(
                    path.join(pathGlobal.upload, 'product')
                );
            } catch (error) {
                isProductFolderExist = false;
            }
            if (!isProductFolderExist)
                await fs.mkdir(
                    path.join(path.join(pathGlobal.upload, 'product'))
                );

            const tempPath = image.filepath,
                newPath = path.join(
                    pathGlobal.upload,
                    'product',
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
                        'product',
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
                    `INSERT INTO products (\`slug\`, \`name\`, \`category\`, \`desc\`, \`price\`, \`imageFileName\`, \`priority\`) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        newSlug,
                        name,
                        insertCategories,
                        desc,
                        `${price}`,
                        imageFileName,
                        `${priority}`,
                    ]
                );
                if (!insertResult.affectedRows)
                    throw new ModelError(
                        'Cập nhật sản phẩm vào cơ sở dữ liệu thất bại (products).',
                        true,
                        500
                    );

                return new ModelResponse(
                    'Tạo sản phẩm thành công.',
                    true,
                    null
                );
            } catch (error) {
                await fs.unlink(path.join(outputFilePath));

                throw new ModelError(
                    'Cập nhật sản phẩm vào cơ sở dữ liệu thất bại (products).',
                    true,
                    500
                );
            }
        } else {
            const insertResult: any = await query(
                `INSERT INTO products (\`slug\`, \`name\`, \`category\`, \`desc\`, \`price\`, \`priority\`) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    newSlug,
                    name,
                    insertCategories,
                    desc,
                    `${price}`,
                    `${priority}`,
                ]
            );
            if (!insertResult.affectedRows)
                throw new ModelError(
                    'Cập nhật sản phẩm vào cơ sở dữ liệu thất bại (products).',
                    true,
                    500
                );

            return new ModelResponse('Tạo sản phẩm thành công.', true, null);
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
 * Update product.
 * @param slug Product slug id.
 * @param name Product name.
 * @param categories Product categories.
 * @param desc Product description.
 * @param price Product price.
 * @param priority Product priority.
 * @returns Returns the response object.
 */
async function updateProduct(
    slug: string,
    name: string,
    categories: string,
    desc: string,
    price: number,
    priority: number
) {
    try {
        if (
            !slug ||
            !name ||
            (!price && price !== 0) ||
            (!priority && priority !== 0)
        )
            throw new ModelError(
                `Thông tin 'slug', 'name', 'price', 'priority' bị thiếu.`,
                false,
                400
            );

        priority = Math.max(0, Math.min(priority, 2147483647));
        price = Math.max(0, Math.min(price, 2147483647));

        let transformedCategories: string[];
        if (categories) {
            transformedCategories = categories?.split(',');
            const categoryResult = (await query(
                    `SELECT slug FROM categories`
                )) as any[],
                currentCategories = categoryResult.map(
                    (category) => category?.slug
                );
            let isInvalidCategory = false;
            transformedCategories?.every((itemCategory) => {
                if (!currentCategories?.includes(itemCategory)) {
                    isInvalidCategory = true;
                    return false;
                }
                return true;
            });
            if (isInvalidCategory)
                throw new ModelError('Danh mục không hợp lệ.', false, 400);
        }
        let insertCategories = transformedCategories
            ? `[${transformedCategories?.map((categoryValue) => `"${categoryValue}"`)?.join(',')}]`
            : '[]';

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
                `SELECT id FROM products WHERE BINARY slug = ?`,
                [newSlug]
            )) as unknown as any[];
            isDuplicate = !!testNewSlugResult.length;
            attempt++;
        }

        const updateResult: any = await query(
            `UPDATE products SET \`slug\` = ?, \`name\` = ?, \`category\` = ?, \`desc\` = ?, \`price\` = ?, \`priority\` = ? WHERE BINARY slug = ?`,
            [
                newSlug,
                name,
                insertCategories,
                desc,
                `${price}`,
                `${priority}`,
                slug,
            ]
        );
        if (!updateResult.affectedRows)
            throw new ModelError(
                `Không tìm thấy sản phẩm '${slug}'.`,
                false,
                400
            );

        return new ModelResponse('Cập nhật sản phẩm thành công.', true, null);
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
 * Delete product.
 * @param slug Product slug id.
 * @returns Returns the response object.
 */
async function deleteProduct(slug: string) {
    try {
        if (!slug)
            throw new ModelError(`Thông tin 'slug' bị thiếu.`, false, 400);

        const getProductImageResult: any = await query(
            `SELECT imageFileName FROM products WHERE BINARY slug = ?`,
            [slug]
        );
        if (!getProductImageResult.length)
            throw new ModelError(
                `Không tìm thấy sản phẩm '${slug}'.`,
                false,
                400
            );

        const associatedImage =
                getProductImageResult[0].imageFileName?.match(/[^\/]+$/)[0],
            associatedImagePath = associatedImage
                ? path.join(pathGlobal.upload, 'product', associatedImage)
                : null;

        const deleteProductResult: any = await query(
            `DELETE FROM products WHERE BINARY slug = ?`,
            [slug]
        );
        if (!deleteProductResult.affectedRows)
            throw new ModelError(
                'Có lỗi xảy ra khi cố gắng xoá sản phẩm khỏi cơ sở dữ liệu.',
                true,
                500
            );

        if (associatedImagePath) {
            try {
                await fs.unlink(associatedImagePath);
            } catch (error) {
                console.error(
                    'Có lỗi xảy ra khi xoá hình ảnh của sản phẩm.\n',
                    error
                );
            }
        }

        return new ModelResponse('Xoá sản phẩm thành công.', true, null);
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
 * Upload product image.
 * @param slug Product slug.
 * @param image Product image.
 * @returns Returns the response object.
 */
async function uploadProductImage(slug: string, image: formidable.File) {
    try {
        if (!slug || !image)
            throw new ModelError(
                `Thông tin 'slug', 'image' bị thiếu.`,
                false,
                400
            );

        const getProductFileNameResult: any = await query(
            `SELECT imageFileName FROM products WHERE BINARY slug = ?`,
            [slug]
        );
        if (!getProductFileNameResult.length)
            throw new ModelError(
                `Không tìm thấy sản phẩm '${slug}'.`,
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

        let isProductFolderExist;
        try {
            isProductFolderExist = await fs.readdir(
                path.join(pathGlobal.upload, 'product')
            );
        } catch (error) {
            isProductFolderExist = false;
        }
        if (!isProductFolderExist)
            await fs.mkdir(path.join(path.join(pathGlobal.upload, 'product')));

        const tempPath = image.filepath,
            newPath = path.join(
                pathGlobal.upload,
                'product',
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
                    'product',
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
            `UPDATE products SET \`imageFileName\` = ? WHERE BINARY slug = ?`,
            [newImageFileName, slug]
        );
        if (!updateImageFileNameResult.affectedRows)
            throw new ModelError(
                `Không tìm thấy sản phẩm '${slug}' khi cập nhật ảnh.`,
                false,
                500
            );

        const oldImageFileName = getProductFileNameResult[0],
            parsedOldImageFileName =
                oldImageFileName.imageFileName?.match(/[^\/]+$/)[0];
        let isOldImageFileExistOnServer;
        try {
            isOldImageFileExistOnServer = await fs.readFile(
                path.join(pathGlobal.upload, 'product', parsedOldImageFileName)
            );
        } catch (error) {
            isOldImageFileExistOnServer = null;
        }

        if (
            !!isOldImageFileExistOnServer &&
            outputFilePath !==
                path.join(pathGlobal.upload, 'product', parsedOldImageFileName)
        )
            await fs.unlink(
                path.join(pathGlobal.upload, 'product', parsedOldImageFileName)
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
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
};
