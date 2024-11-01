/**
 * @file category.ts
 * @description Category router controller.
 */

'use strict';
import formidable from 'formidable';
import { RequestHandler } from 'express';

import model from '@sources/models/category';

/**
 * Category router controller.
 */
class CategoryController {
    // [GET] /category
    getCategories: RequestHandler = async (request, response, next) => {
        const query: { page?: string; itemPerPage?: string } = {
                ...request.query,
            },
            page = parseInt(query.page),
            itemPerPage = parseInt(query.itemPerPage);

        const categoriesResult = await model.getCategories(
            page || undefined,
            itemPerPage || undefined
        );
        if (!categoriesResult.success)
            return response.status(categoriesResult.statusCode).json({
                message: categoriesResult.message,
            });

        return response.status(categoriesResult.statusCode).json({
            message: categoriesResult.message,
            data: categoriesResult.data,
        });
    };

    // [GET] /categoriesCount
    getCategoriesCount: RequestHandler = async (request, response, next) => {
        const categoriesCountResult = await model.getCategoriesCount();
        if (!categoriesCountResult.success)
            return response.status(categoriesCountResult.statusCode).json({
                message: categoriesCountResult.message,
            });

        return response.status(categoriesCountResult.statusCode).json({
            message: categoriesCountResult.message,
            data: categoriesCountResult.data,
        });
    };

    // [POST] /category
    createCategory: RequestHandler = async (request, response, next) => {
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

    // [PUT] /category
    updateCategory: RequestHandler = async (request, response, next) => {
        const { slug, name, desc, priority } = request.body;

        const updateCategoryResult = await model.updateCategory(
            slug,
            name,
            desc,
            parseInt(`${priority}`?.replace(/\D/g, ''))
        );
        if (!updateCategoryResult.success)
            return response.status(updateCategoryResult.statusCode).json({
                message: updateCategoryResult.message,
            });

        return response.status(updateCategoryResult.statusCode).json({
            message: updateCategoryResult.message,
            data: updateCategoryResult.data,
        });
    };

    // [DELETE] /category
    deleteCategory: RequestHandler = async (request, response, next) => {
        const { slug } = request.body;

        const deleteCategoryResult = await model.deleteCategory(slug);
        if (!deleteCategoryResult.success)
            return response.status(deleteCategoryResult.statusCode).json({
                message: deleteCategoryResult.message,
            });

        return response.status(deleteCategoryResult.statusCode).json({
            message: deleteCategoryResult.message,
            data: deleteCategoryResult.data,
        });
    };

    // [POST] /category/image
    updateCategoryImage: RequestHandler = async (request, response, next) => {
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

export default new CategoryController();
