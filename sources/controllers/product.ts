/**
 * @file product.ts
 * @description Product router controller.
 */

'use strict';
import formidable from 'formidable';
import { RequestHandler } from 'express';

import model from '@sources/models/product';

/**
 * Product router controller.
 */
class ProductController {
    // [GET] /product
    getProducts: RequestHandler = async (request, response, next) => {
        const query: { page?: string; itemPerPage?: string } = {
                ...request.query,
            },
            page = parseInt(query.page),
            itemPerPage = parseInt(query.itemPerPage);

        const productsResult = await model.getProducts(
            page || undefined,
            itemPerPage || undefined
        );
        if (!productsResult.success)
            return response.status(productsResult.statusCode).json({
                message: productsResult.message,
            });

        return response.status(productsResult.statusCode).json({
            message: productsResult.message,
            data: productsResult.data,
        });
    };

    // [POST] /product
    createProduct: RequestHandler = async (request, response, next) => {
        try {
            const form = formidable({
                    maxFiles: 1,
                    allowEmptyFiles: true,
                    minFileSize: 0,
                }),
                parseResult = await form.parse(request),
                fields = parseResult[0],
                files = parseResult[1],
                nameArray = fields?.name || null,
                categoriesArray = fields?.categories || null,
                descArray = fields?.desc || null,
                priceArray = fields?.price || null,
                priorityArray = fields?.priority || null,
                imageArray = files?.image || null,
                name = nameArray?.length ? nameArray[0] : null,
                categories = categoriesArray?.length
                    ? categoriesArray[0]
                    : null,
                desc = descArray?.length ? descArray[0] : null,
                price = priceArray?.length ? priceArray[0] : null,
                priority = priorityArray?.length ? priorityArray[0] : null,
                image = imageArray?.length ? imageArray[0] : null;

            const createResult = await model.createProduct(
                name,
                categories,
                desc,
                parseInt(`${price}`?.replace(/\D/g, '')),
                parseInt(`${priority}`?.replace(/\D/g, '')),
                image
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

    // [PUT] /product
    updateProduct: RequestHandler = async (request, response, next) => {
        const { slug, name, categories, desc, price, priority } = request.body;

        const updateProductResult = await model.updateProduct(
            slug,
            name,
            categories,
            desc,
            price,
            parseInt(`${priority}`?.replace(/\D/g, ''))
        );
        if (!updateProductResult.success)
            return response.status(updateProductResult.statusCode).json({
                message: updateProductResult.message,
            });

        return response.status(updateProductResult.statusCode).json({
            message: updateProductResult.message,
            data: updateProductResult.data,
        });
    };

    // [DELETE] /product
    deleteProduct: RequestHandler = async (request, response, next) => {
        const { slug } = request.body;

        const deleteProductResult = await model.deleteProduct(slug);
        if (!deleteProductResult.success)
            return response.status(deleteProductResult.statusCode).json({
                message: deleteProductResult.message,
            });

        return response.status(deleteProductResult.statusCode).json({
            message: deleteProductResult.message,
            data: deleteProductResult.data,
        });
    };

    // [POST] /product/image
    updateProductImage: RequestHandler = async (request, response, next) => {
        try {
            const form = formidable({
                    maxFiles: 1,
                    allowEmptyFiles: true,
                    minFileSize: 0,
                }),
                parseResult = await form.parse(request),
                fields = parseResult[0],
                files = parseResult[1],
                slugArray = fields?.slug || null,
                imageArray = files?.image || null,
                slug = slugArray?.length ? slugArray[0] : null,
                image = imageArray?.length ? imageArray[0] : null;

            const uploadResult = await model.uploadProductImage(slug, image);
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

export default new ProductController();
