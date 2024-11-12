/**
 * @file order.ts
 * @description Order router controller.
 */

'use strict';
import { RequestHandler } from 'express';

import model from '@sources/models/order';

/**
 * Order router controller.
 */
class OrderController {
    // [GET] /order
    getOrders: RequestHandler = async (request, response, next) => {
        const query: { page?: string; itemPerPage?: string } = {
                ...request.query,
            },
            page = parseInt(query.page),
            itemPerPage = parseInt(query.itemPerPage);

        const getOrdersResult = await model.getOrders(
            page || undefined,
            itemPerPage || undefined
        );
        if (!getOrdersResult.success)
            return response.status(getOrdersResult.statusCode).json({
                message: getOrdersResult.message,
            });

        return response.status(getOrdersResult.statusCode).json({
            message: getOrdersResult.message,
            data: getOrdersResult.data,
        });
    };

    // [POST] /order
    createOrder: RequestHandler = async (request, response, next) => {
        const {
            deliveryMethod,
            deliveryAddress,
            deliveryTime,
            pickupAt,
            deliveryNote,
            customerName,
            customerPhoneNumber,
            items,
        } = request.body;

        const createOrderResult = await model.createOrder(
            deliveryMethod,
            customerName,
            customerPhoneNumber,
            items,
            deliveryAddress,
            deliveryTime,
            pickupAt,
            deliveryNote
        );
        if (!createOrderResult.success)
            return response
                .status(createOrderResult.statusCode)
                .json({ message: createOrderResult.message });

        return response
            .status(200)
            .json({ message: 'Thành công.', data: createOrderResult.data });
    };

    // [PATCH] /order
    updateOrder: RequestHandler = async (request, response, next) => {
        const { orderId, status } = request.body;

        const updateOrderResult = await model.updateOrder(orderId, status);
        if (!updateOrderResult.success)
            return response
                .status(updateOrderResult.statusCode)
                .json({ message: updateOrderResult.message });

        return response
            .status(200)
            .json({ message: 'Thành công.', data: updateOrderResult.data });
    };

    // [DELETE] /order
    deleteOrder: RequestHandler = async (request, response, next) => {
        const { orderId } = request.body;

        const deleteOrderResult = await model.deleteOrder(orderId);
        if (!deleteOrderResult.success)
            return response.status(deleteOrderResult.statusCode).json({
                message: deleteOrderResult.message,
            });

        return response.status(deleteOrderResult.statusCode).json({
            message: deleteOrderResult.message,
            data: deleteOrderResult.data,
        });
    };

    // [POST] /order/restore-product-quantity
    restoreProductQuantity: RequestHandler = async (
        request,
        response,
        next
    ) => {
        const { orderId } = request.body;

        const restoreResult = await model.restoreProductQuantity(orderId);
        if (!restoreResult.success)
            return response
                .status(restoreResult.statusCode)
                .json({ message: restoreResult.message });

        return response
            .status(200)
            .json({ message: restoreResult.message, data: restoreResult.data });
    };
}

export default new OrderController();
