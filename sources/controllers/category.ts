/**
 * @file category.ts
 * @description Category router controller.
 */

'use strict';
import formidable from 'formidable';
import { RequestHandler } from 'express';

import type { TypedResponse } from '@root/global';
import { RawAPIResponse } from '@sources/apis/emart/types';
import * as APITypes from '@sources/apis/emart/types';
import model from '@sources/models/category';
import staticTexts from '@sources/apis/emart/static-texts';

/**
 * Category router controller.
 */
class CategoryController {
    // [GET] /category
    getCategories: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.GetCategoriesResponseData>
        >,
        next
    ) => {
        const query: { page?: string; itemPerPage?: string } = {
                ...request.query,
            },
            page = parseInt(query.page),
            itemPerPage = parseInt(query.itemPerPage);

        const categoriesResult = await model.getCategories(
            page || undefined,
            itemPerPage || undefined
        );

        return response
            .status(categoriesResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.GetCategoriesResponseData>(
                    categoriesResult.message,
                    categoriesResult.success,
                    categoriesResult.data
                )
            );
    };

    // [GET] /categoriesCount
    getCategoriesCount: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.GetCategoriesCountResponseData>
        >,
        next
    ) => {
        const categoriesCountResult = await model.getCategoriesCount();

        return response
            .status(categoriesCountResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.GetCategoriesCountResponseData>(
                    categoriesCountResult.message,
                    categoriesCountResult.success,
                    categoriesCountResult.data
                )
            );
    };

    // [POST] /category
    createCategory: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.CreateCategoryResponseData>
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
                descArray = fields?.desc || null,
                priorityArray = fields?.priority || null,
                imageArray = files?.image || null,
                name = nameArray?.length ? nameArray[0] : null,
                desc = descArray?.length ? descArray[0] : null,
                priority = priorityArray?.length ? priorityArray[0] : null,
                image = imageArray?.length ? imageArray[0] : null;

            const createResult = await model.createCategory(
                name,
                desc,
                parseInt(`${priority}`?.replace(/\D/g, '')),
                image
            );

            return response
                .status(createResult.statusCode)
                .json(
                    new RawAPIResponse<APITypes.CreateCategoryResponseData>(
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
                        new RawAPIResponse<APITypes.CreateCategoryResponseData>(
                            staticTexts.fileExceedLimit,
                            false,
                            null
                        )
                    );

            return response
                .status(500)
                .json(
                    new RawAPIResponse<APITypes.CreateCategoryResponseData>(
                        staticTexts.unknownError,
                        false,
                        null
                    )
                );
        }
    };

    // [PUT] /category
    updateCategory: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.UpdateCategoryResponseData>
        >,
        next
    ) => {
        const { slug, name, desc, priority } = request.body;

        const updateCategoryResult = await model.updateCategory(
            slug,
            name,
            desc,
            parseInt(`${priority}`?.replace(/\D/g, ''))
        );

        return response
            .status(updateCategoryResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.UpdateCategoryResponseData>(
                    updateCategoryResult.message,
                    updateCategoryResult.success,
                    updateCategoryResult.data
                )
            );
    };

    // [DELETE] /category
    deleteCategory: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.DeleteCategoryResponseData>
        >,
        next
    ) => {
        const { slug } = request.body;

        const deleteCategoryResult = await model.deleteCategory(slug);

        return response
            .status(deleteCategoryResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.DeleteCategoryResponseData>(
                    deleteCategoryResult.message,
                    deleteCategoryResult.success,
                    deleteCategoryResult.data
                )
            );
    };

    // [POST] /category/image
    updateCategoryImage: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.UploadCategoryImageResponseData>
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

            const uploadResult = await model.uploadCategoryImage(slug, image);

            return response
                .status(201)
                .json(
                    new RawAPIResponse<APITypes.UploadCategoryImageResponseData>(
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
                        new RawAPIResponse<APITypes.UploadCategoryImageResponseData>(
                            staticTexts.fileExceedLimit,
                            false,
                            null
                        )
                    );

            return response
                .status(500)
                .json(
                    new RawAPIResponse<APITypes.UploadCategoryImageResponseData>(
                        staticTexts.unknownError,
                        false,
                        null
                    )
                );
        }
    };
}

export default new CategoryController();
