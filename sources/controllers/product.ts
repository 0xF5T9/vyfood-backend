/**
 * @file product.ts
 * @description Product router controller.
 */

'use strict';
import formidable from 'formidable';
import { RequestHandler } from 'express';

import type { TypedResponse } from '@root/global';
import { RawAPIResponse } from '@sources/apis/emart/types';
import * as APITypes from '@sources/apis/emart/types';
import model from '@sources/models/product';
import staticTexts from '@sources/apis/emart/static-texts';

/**
 * Product router controller.
 */
class ProductController {
    // [GET] /product
    getProducts: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.GetProductsResponseData>
        >,
        next
    ) => {
        const query: { page?: string; itemPerPage?: string } = {
                ...request.query,
            },
            page = parseInt(query.page),
            itemPerPage = parseInt(query.itemPerPage);

        const productsResult = await model.getProducts(
            page || undefined,
            itemPerPage || undefined
        );

        return response
            .status(productsResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.GetProductsResponseData>(
                    productsResult.message,
                    productsResult.success,
                    productsResult.data
                )
            );
    };

    // [POST] /product
    createProduct: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.CreateProductResponseData>
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
                nameArray = fields?.name || null,
                categoriesArray = fields?.categories || null,
                descArray = fields?.desc || null,
                priceArray = fields?.price || null,
                quantityArray = fields?.quantity || null,
                priorityArray = fields?.priority || null,
                imageArray = files?.image || null,
                name = nameArray?.length ? nameArray[0] : null,
                categories = categoriesArray?.length
                    ? categoriesArray[0]
                    : null,
                desc = descArray?.length ? descArray[0] : null,
                price = priceArray?.length ? priceArray[0] : null,
                quantity = quantityArray?.length ? quantityArray[0] : null,
                priority = priorityArray?.length ? priorityArray[0] : null,
                image = imageArray?.length ? imageArray[0] : null;

            const createResult = await model.createProduct(
                name,
                categories,
                desc,
                parseFloat(`${price}`?.replace(/[^0-9.]/g, '')),
                parseInt(`${quantity}`?.replace(/\D/g, '')),
                parseInt(`${priority}`?.replace(/\D/g, '')),
                image
            );

            return response
                .status(createResult.statusCode)
                .json(
                    new RawAPIResponse<APITypes.CreateProductResponseData>(
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
                        new RawAPIResponse<APITypes.CreateProductResponseData>(
                            staticTexts.fileExceedLimit,
                            false,
                            null
                        )
                    );

            return response
                .status(500)
                .json(
                    new RawAPIResponse<APITypes.CreateProductResponseData>(
                        staticTexts.unknownError,
                        false,
                        null
                    )
                );
        }
    };

    // [PUT] /product
    updateProduct: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.UpdateProductResponseData>
        >,
        next
    ) => {
        const { slug, name, categories, desc, price, quantity, priority } =
            request.body;

        const updateProductResult = await model.updateProduct(
            slug,
            name,
            categories,
            desc,
            parseFloat(`${price}`?.replace(/[^0-9.]/g, '')),
            parseInt(`${quantity}`?.replace(/\D/g, '')),
            parseInt(`${priority}`?.replace(/\D/g, ''))
        );

        return response
            .status(updateProductResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.UpdateProductResponseData>(
                    updateProductResult.message,
                    updateProductResult.success,
                    updateProductResult.data
                )
            );
    };

    // [DELETE] /product
    deleteProduct: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.DeleteProductResponseData>
        >,
        next
    ) => {
        const { slug } = request.body;

        const deleteProductResult = await model.deleteProduct(slug);

        return response
            .status(deleteProductResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.DeleteProductResponseData>(
                    deleteProductResult.message,
                    deleteProductResult.success,
                    deleteProductResult.data
                )
            );
    };

    // [POST] /product/image
    updateProductImage: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.UploadProductImageResponseData>
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
                slugArray = fields?.slug || null,
                imageArray = files?.image || null,
                slug = slugArray?.length ? slugArray[0] : null,
                image = imageArray?.length ? imageArray[0] : null;

            const uploadResult = await model.uploadProductImage(slug, image);

            return response
                .status(uploadResult.statusCode)
                .json(
                    new RawAPIResponse<APITypes.UploadProductImageResponseData>(
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
                        new RawAPIResponse<APITypes.CreateProductResponseData>(
                            staticTexts.fileExceedLimit,
                            false,
                            null
                        )
                    );

            return response
                .status(500)
                .json(
                    new RawAPIResponse<APITypes.CreateProductResponseData>(
                        staticTexts.unknownError,
                        false,
                        null
                    )
                );
        }
    };
}

export default new ProductController();
