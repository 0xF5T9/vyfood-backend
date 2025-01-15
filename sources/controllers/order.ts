/**
 * @file order.ts
 * @description Order router controller.
 */

'use strict';
import { RequestHandler } from 'express';

import type { TypedResponse } from '@root/global';
import { RawAPIResponse } from '@sources/apis/emart/types';
import * as APITypes from '@sources/apis/emart/types';
import model from '@sources/models/order';

/**
 * Order router controller.
 */
class OrderController {
    // [GET] /order
    getOrders: RequestHandler = async (
        request,
        response: TypedResponse<RawAPIResponse<APITypes.GetOrdersResponseData>>,
        next
    ) => {
        const query: { page?: string; itemPerPage?: string } = {
                ...request.query,
            },
            page = parseInt(query.page),
            itemPerPage = parseInt(query.itemPerPage);

        const getOrdersResult = await model.getOrders(
            page || undefined,
            itemPerPage || undefined
        );

        return response
            .status(getOrdersResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.GetOrdersResponseData>(
                    getOrdersResult.message,
                    getOrdersResult.success,
                    getOrdersResult.data
                )
            );
    };

    // [POST] /order
    createOrder: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.CreateOrderResponseData>
        >,
        next
    ) => {
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

        return response
            .status(createOrderResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.CreateOrderResponseData>(
                    createOrderResult.message,
                    createOrderResult.success,
                    createOrderResult.data
                )
            );
    };

    // [PATCH] /order
    updateOrder: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.UpdateOrderResponseData>
        >,
        next
    ) => {
        const { orderId, status } = request.body;

        const updateOrderResult = await model.updateOrder(orderId, status);

        return response
            .status(updateOrderResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.UpdateOrderResponseData>(
                    updateOrderResult.message,
                    updateOrderResult.success,
                    updateOrderResult.data
                )
            );
    };

    // [DELETE] /order
    deleteOrder: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.DeleteOrderResponseData>
        >,
        next
    ) => {
        const { orderId } = request.body;

        const deleteOrderResult = await model.deleteOrder(orderId);

        return response
            .status(deleteOrderResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.DeleteOrderResponseData>(
                    deleteOrderResult.message,
                    deleteOrderResult.success,
                    deleteOrderResult.data
                )
            );
    };

    // [POST] /order/restore-product-quantity
    restoreProductQuantity: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.RestoreProductQuantityResponseData>
        >,
        next
    ) => {
        const { orderId } = request.body;

        const restoreResult = await model.restoreProductQuantity(orderId);

        return response
            .status(restoreResult.statusCode)
            .json(
                new RawAPIResponse<APITypes.RestoreProductQuantityResponseData>(
                    restoreResult.message,
                    restoreResult.success,
                    restoreResult.data
                )
            );
    };
}

export default new OrderController();
