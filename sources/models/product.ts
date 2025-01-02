/**
 * @file product.ts
 * @description Product router models.
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

import { query, queryTransaction } from '@sources/services/database';
import {
    ModelError,
    ModelResponse,
    getOffset,
    toSlug,
} from '@sources/utility/model';
import pathGlobal from '@sources/global/path';

/**
 * Generate a new unique product slug for insertion.
 * @param connection The mysql pool connection instance.
 * @param productName The product name.
 * @returns Returns a unique product slug ready for insertion.
 * @note This function is meant to be called in a transaction context.
 */
async function generateProductSlug(
    connection: PoolConnection,
    productName: string
): Promise<string> {
    let slug = toSlug(productName),
        slugGenerateAttempt = 0,
        isDuplicate = true;
    while (isDuplicate) {
        if (slugGenerateAttempt !== 0)
            slug = `${toSlug(productName)}-${Math.floor(Math.random() * Date.now())}`;
        if (slugGenerateAttempt === 3)
            throw new ModelError(
                'Có lỗi xảy ra khi cố gắng tạo slug.',
                true,
                500
            );
        const [testNewSlugResult] = await connection.execute<RowDataPacket[]>(
            `SELECT id FROM products WHERE BINARY slug = ?`,
            [slug]
        );
        isDuplicate = !!testNewSlugResult.length;
        slugGenerateAttempt++;
    }

    return slug;
}

/**
 * Generate product image insertion data.
 * @param imageFile Formidable image file.
 * @returns Returns product image insertion data or null if 'imageFile' argument is null.
 * @note This function is meant to be called in a transaction context.
 * @note This function does not create an image on disk.
 */
async function generateProductImageInsertData(
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

    const tempPath = imageFile.filepath,
        newPath = path.join(
            pathGlobal.upload,
            'product',
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
                'product',
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
 * Check if the categories are valid.
 * @param connection The mysql pool connection instance.
 * @param categories The categories to be checked.
 * @returns Returns true if the categories are valid, otherwise returns false.
 * @note This function is meant to be called in a transaction context.
 */
async function validateProductCategories(
    connection: PoolConnection,
    categories: string[]
): Promise<boolean> {
    if (!categories) return false;

    const [getCategoriesSlugResult] = await connection.execute<RowDataPacket[]>(
            'SELECT slug FROM categories'
        ),
        validCategoriesSlug: string[] = getCategoriesSlugResult.map(
            (category) => category?.slug
        );

    const isCategoriesValid = categories?.every((categorySlug) => {
        if (!validCategoriesSlug?.includes(categorySlug)) return false;
        return true;
    });

    return isCategoriesValid;
}

/**
 * Get products.
 * @param page Pagination.
 * @param itemPerPage Item per page.
 * @returns Returns the response object.
 */
async function getProducts(page: number = 1, itemPerPage: number = 12) {
    try {
        const offset = getOffset(page, itemPerPage);

        const itemsQueryResult = await query<RowDataPacket[]>(
                `SELECT slug, \`name\`, \`desc\`, price, imageFileName, quantity, priority FROM products LIMIT ?, ?`,
                [`${offset}`, `${itemPerPage}`]
            ),
            products = itemsQueryResult || [];

        const transformedProducts = await Promise.all(
            products.map(async (product) => {
                const getProductCategoriesResult = await query<RowDataPacket[]>(
                        'SELECT product_categories.category_slug FROM product_categories JOIN categories ON product_categories.category_slug = categories.slug WHERE product_categories.product_slug = ? ORDER BY categories.priority DESC',
                        [product.slug]
                    ),
                    productCategories = getProductCategoriesResult.map(
                        (category) => `${category['category_slug']}`
                    );
                product['category'] = productCategories;
                return product;
            })
        );

        const totalItemsQueryResult = await query<RowDataPacket[]>(
                `SELECT COUNT(*) AS total_items from products`
            ),
            totalProducts = totalItemsQueryResult[0].total_items;

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
            products: transformedProducts,
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
 * @param quantity Product quantity.
 * @param priority Product priority.
 * @param image Product image.
 * @returns Returns the response object.
 */
async function createProduct(
    name: string,
    categories: string,
    desc: string,
    price: number,
    quantity: number,
    priority: number,
    image?: formidable.File
) {
    try {
        if (
            !name ||
            (!price && price !== 0) ||
            (!quantity && quantity !== 0) ||
            (!priority && priority !== 0)
        )
            throw new ModelError(
                `Thông tin 'name', 'price', 'quantity', 'priority' bị thiếu.`,
                false,
                400
            );

        if (desc) {
            const parsedDesc = JSON.parse(desc);
            if (
                parsedDesc?.length === 1 &&
                parsedDesc[0]?.children?.length &&
                parsedDesc[0]?.children[0]?.text === ''
            )
                desc = '';
        }

        quantity = Math.max(0, Math.min(quantity, 2147483647));
        priority = Math.max(0, Math.min(priority, 2147483647));
        price = Math.max(0, Math.min(price, 2147483647));

        if (image && !image?.mimetype?.includes('image'))
            throw new ModelError(
                'Định dạng tệp không phải là hình ảnh.',
                false,
                400
            );

        await queryTransaction<void>(async (connection) => {
            const productSlug = await generateProductSlug(connection, name),
                imageInsertData = await generateProductImageInsertData(image);

            const [insertProductResult] =
                await connection.execute<ResultSetHeader>(
                    `INSERT INTO products (\`slug\`, \`name\`, \`desc\`, \`price\`, \`imageFileName\`, \`quantity\`, \`priority\`) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        productSlug,
                        name,
                        desc,
                        `${price}`,
                        imageInsertData?.fileName || null,
                        `${quantity}`,
                        `${priority}`,
                    ]
                );
            if (!insertProductResult.affectedRows)
                throw new ModelError(
                    'Cập nhật sản phẩm vào cơ sở dữ liệu thất bại (products).',
                    true,
                    500
                );

            if (categories) {
                const isCategoriesValid = await validateProductCategories(
                    connection,
                    categories?.split(',')
                );
                if (!isCategoriesValid)
                    throw new ModelError('Danh mục không hợp lệ.', false, 400);

                const insertCategoriesResult = await Promise.all(
                    categories?.split(',').map(async (categorySlug) => {
                        const [insertCategoryResult] =
                            await connection.execute<ResultSetHeader>(
                                'INSERT INTO product_categories (product_slug, category_slug) VALUES (?, ?)',
                                [productSlug, categorySlug]
                            );
                        if (!insertCategoryResult.affectedRows) return false;
                        return true;
                    })
                );

                for (const result in insertCategoriesResult) {
                    if (!result)
                        throw new ModelError(
                            'Có lỗi xảy ra khi thêm danh mục của sản phẩm (product_categories)',
                            true,
                            500
                        );
                }
            }

            if (imageInsertData)
                await fs.writeFile(
                    imageInsertData.filePath,
                    imageInsertData.fileRawData
                );
        });

        return new ModelResponse('Tạo sản phẩm thành công.', true, null);
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
 * @param quantity Product quantity.
 * @param priority Product priority.
 * @returns Returns the response object.
 */
async function updateProduct(
    slug: string,
    name: string,
    categories: string,
    desc: string,
    price: number,
    quantity: number,
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

        if (desc) {
            const parsedDesc = JSON.parse(desc);
            if (
                parsedDesc?.length === 1 &&
                parsedDesc[0]?.children?.length &&
                parsedDesc[0]?.children[0]?.text === ''
            )
                desc = '';
        }

        priority = Math.max(0, Math.min(priority, 2147483647));
        price = Math.max(0, Math.min(price, 2147483647));
        if (quantity || quantity === 0)
            quantity = Math.max(0, Math.min(quantity, 2147483647));

        await queryTransaction<void>(async (connection) => {
            const productSlug = await generateProductSlug(connection, name);

            let columns = ['slug', 'name', 'desc', 'price', 'priority'],
                params = [productSlug, name, desc, `${price}`, `${priority}`];
            if (quantity || quantity === 0) {
                columns.push('quantity');
                params.push(`${quantity}`);
            }

            const setSQL = columns
                .map((property) => `\`${property}\` = ?`)
                .join(', ');

            const [updateProductResult] =
                await connection.execute<ResultSetHeader>(
                    `UPDATE products SET ${setSQL} WHERE BINARY slug = ?`,
                    [...params, slug]
                );
            if (!updateProductResult.affectedRows)
                throw new ModelError(
                    `Không tìm thấy sản phẩm '${slug}'.`,
                    false,
                    400
                );

            await connection.execute<ResultSetHeader>(
                'DELETE FROM product_categories WHERE product_slug = ?',
                [productSlug]
            );

            if (categories) {
                const isCategoriesValid = await validateProductCategories(
                    connection,
                    categories?.split(',')
                );
                if (!isCategoriesValid)
                    throw new ModelError('Danh mục không hợp lệ.', false, 400);

                const insertCategoriesResult = await Promise.all(
                    categories?.split(',').map(async (categorySlug) => {
                        const [insertCategoryResult] =
                            await connection.execute<ResultSetHeader>(
                                'INSERT INTO product_categories (product_slug, category_slug) VALUES (?, ?)',
                                [productSlug, categorySlug]
                            );
                        if (!insertCategoryResult.affectedRows) return false;
                        return true;
                    })
                );

                for (const result in insertCategoriesResult) {
                    if (!result)
                        throw new ModelError(
                            'Có lỗi xảy ra khi thêm danh mục của sản phẩm (product_categories)',
                            true,
                            500
                        );
                }
            }
        });

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

        await queryTransaction<void>(async (connection) => {
            const [getProductImageResult] = await connection.execute<
                RowDataPacket[]
            >(`SELECT imageFileName FROM products WHERE BINARY slug = ?`, [
                slug,
            ]);
            if (!getProductImageResult.length)
                throw new ModelError(
                    `Không tìm thấy sản phẩm '${slug}'.`,
                    false,
                    400
                );

            const [deleteProductResult] =
                await connection.execute<ResultSetHeader>(
                    `DELETE FROM products WHERE BINARY slug = ?`,
                    [slug]
                );
            if (!deleteProductResult.affectedRows)
                throw new ModelError(
                    'Có lỗi xảy ra khi cố gắng xoá sản phẩm khỏi cơ sở dữ liệu.',
                    true,
                    500
                );

            const associatedImage =
                    getProductImageResult[0]
                        .imageFileName /*?.match(/[^\/]+$/)[0]*/,
                associatedImagePath = associatedImage
                    ? path.join(pathGlobal.upload, 'product', associatedImage)
                    : null;

            if (associatedImagePath) await fs.unlink(associatedImagePath);
        });

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

        if (!image?.mimetype?.includes('image'))
            throw new ModelError(
                'Định dạng tệp không phải là hình ảnh.',
                false,
                400
            );

        await queryTransaction<void>(async (connection) => {
            const [getProductFileNameResult] = await connection.execute<
                RowDataPacket[]
            >(`SELECT imageFileName FROM products WHERE BINARY slug = ?`, [
                slug,
            ]);
            if (!getProductFileNameResult.length)
                throw new ModelError(
                    `Không tìm thấy sản phẩm '${slug}'.`,
                    false,
                    400
                );

            const imageInsertData = await generateProductImageInsertData(image),
                newImageFileName = path.parse(imageInsertData.filePath).base;

            const [updateImageFileNameResult] =
                await connection.execute<ResultSetHeader>(
                    `UPDATE products SET \`imageFileName\` = ? WHERE BINARY slug = ?`,
                    [newImageFileName, slug]
                );
            if (!updateImageFileNameResult.affectedRows)
                throw new ModelError(
                    `Không tìm thấy sản phẩm '${slug}' khi cập nhật ảnh.`,
                    false,
                    500
                );

            const oldImageFileName =
                getProductFileNameResult[0]
                    ?.imageFileName; /*?.match(/[^\/]+$/)[0]*/
            let isOldImageFileExistOnServer;
            try {
                isOldImageFileExistOnServer = await fs.readFile(
                    path.join(pathGlobal.upload, 'product', oldImageFileName)
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
                    path.join(pathGlobal.upload, 'product', oldImageFileName)
            )
                await fs.unlink(
                    path.join(pathGlobal.upload, 'product', oldImageFileName)
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
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
};
