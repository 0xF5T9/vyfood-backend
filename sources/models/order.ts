/**
 * @file order.ts
 * @description Order router models.
 */

'use strict';

import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { queryTransaction } from '@sources/services/database';
import {
    ModelError,
    ModelResponse,
    getOffset,
    toSQLTimestamp,
} from '@sources/utility/model';
import staticTexts from '@sources/apis/emart/static-texts';

type Product = {
    slug: string;
    name: string;
    category: string[];
    desc: string;
    price: number;
    imageFileName: string;
    quantity: number;
    priority: number;
};

type CartItem = {
    id: number;
    product: Product;
    totalItems: number;
    note: string;
};

type RawOrder = {
    orderId: number;
    deliveryMethod: 'shipping' | 'pickup';
    deliveryAddress: string;
    deliveryTime: string;
    pickupAt: string;
    deliveryNote: string;
    customerName: string;
    customerPhoneNumber: string;
    items: CartItem[];
    status: 'processing' | 'completed' | 'aborted';
    createdAt: string;
};

/**
 * Get orders.
 * @param page Pagination.
 * @param itemPerPage Item per page.
 * @returns Returns the response object.
 */
async function getOrders(page: number = 1, itemPerPage: number = 12) {
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
            orders: RawOrder[];
        }>(async (connection) => {
            const [itemsQueryResult] = await connection.execute<
                    Array<RowDataPacket & RawOrder>
                >(
                    `SELECT orderId, deliveryMethod, deliveryAddress, deliveryTime, pickupAt, deliveryNote, customerName, customerPhoneNumber, items, status, createdAt FROM orders LIMIT ?, ?`,
                    [`${offset}`, `${itemPerPage}`]
                ),
                orders = itemsQueryResult || [];

            const [totalItemsQueryResult] = await connection.execute<
                    Array<RowDataPacket & { total_items: number }>
                >(`SELECT COUNT(*) AS total_items from \`orders\``),
                totalOrders = totalItemsQueryResult[0].total_items;

            const prevPage = Math.max(1, page - 1),
                nextPage = Math.max(
                    1,
                    Math.min(Math.ceil(totalOrders / itemPerPage), page + 1)
                );

            const meta = {
                page,
                itemPerPage,
                totalItems: totalOrders,
                isFirstPage: page === 1,
                isLastPage: page === nextPage,
                prevPage: `/order?page=${prevPage}&itemPerPage=${itemPerPage}`,
                nextPage: `/order?page=${nextPage}&itemPerPage=${itemPerPage}`,
            };

            return { meta, orders: orders };
        });

        return new ModelResponse(staticTexts.getDataSuccess, true, result);
    } catch (error) {
        console.error(error);
        if (error.isServerError === undefined) error.isServerError = true;

        return new ModelResponse(
            error.isServerError === false
                ? error.message
                : staticTexts.unknownError,
            false,
            null,
            error.isServerError,
            error.statusCode
        );
    }
}

/**
 * Create order.
 * @param deliveryMethod Delivery method.
 * @param customerName Customer name.
 * @param customerPhoneNumber Customer phone number.
 * @param items Order items.
 * @param deliveryAddress Delivery address.
 * @param deliveryTime Delivery time.
 * @param pickupAt Pick up location.
 * @param deliveryNote Delivery note.
 * @returns Returns the response object.
 */
async function createOrder(
    deliveryMethod: string,
    customerName: string,
    customerPhoneNumber: string,
    items: CartItem[],
    deliveryAddress?: string,
    deliveryTime?: string,
    pickupAt?: string,
    deliveryNote?: string
) {
    try {
        if (!deliveryMethod || !customerName || !customerPhoneNumber || !items)
            throw new ModelError(
                `${staticTexts.invalidParameters}'deliveryMethod', 'customerName', 'customerPhoneNumber', 'items'`,
                false,
                400
            );

        if (deliveryMethod !== 'shipping' && deliveryMethod !== 'pickup')
            throw new ModelError(staticTexts.invalidShippingMethod, false, 400);

        if (deliveryMethod === 'shipping' && !deliveryAddress)
            throw new ModelError(
                `${staticTexts.invalidParameters}'deliveryAddress'`,
                false,
                400
            );

        if (deliveryMethod === 'pickup' && !pickupAt)
            throw new ModelError(
                `${staticTexts.invalidParameters}'pickupAt'`,
                false,
                400
            );

        if (!Array.isArray(items) || !items.length)
            throw new ModelError(
                `${staticTexts.invalidParameters}'items'`,
                false,
                400
            );

        await queryTransaction<void>(async (connection) => {
            // Reject the request if the cart product items information is not matches the
            // information in the database.
            const sqlCondition = items?.map(() => `slug = ?`).join(' OR '),
                params = items?.map((item) => item?.product?.slug);
            const [getProductsResult] = await connection.execute<
                RowDataPacket[]
            >(
                `SELECT \`slug\`, \`price\`, \`quantity\` FROM \`products\` WHERE ${sqlCondition}`,
                params
            );
            const mappedProducts = getProductsResult?.reduce((acc, product) => {
                acc[product?.slug] = product;
                return acc;
            }, {} as RowDataPacket);

            for (let i = 0; i < items.length; i++) {
                const [currentQuantityResult] = await connection.execute<
                    RowDataPacket[]
                >(
                    `SELECT \`quantity\` FROM \`products\` WHERE BINARY \`slug\` = ?`,
                    [items[i].product.slug]
                );
                if (!currentQuantityResult.length)
                    throw new ModelError(
                        staticTexts.orderNeedUpdate,
                        false,
                        409
                    );

                const currentQuantity = currentQuantityResult[0].quantity,
                    newQuantity = currentQuantity - items[i].totalItems;
                if (newQuantity < 0)
                    throw new ModelError(
                        staticTexts.orderNeedUpdate,
                        false,
                        409
                    );
                const [updateItemQuantity] =
                    await connection.execute<ResultSetHeader>(
                        `UPDATE \`products\` SET \`quantity\` = ? WHERE BINARY slug = ?`,
                        [`${newQuantity}`, items[i].product.slug]
                    );
                if (!updateItemQuantity.affectedRows)
                    throw new ModelError(
                        staticTexts.createOrderError,
                        true,
                        500
                    );
            }

            items?.every((item) => {
                if (
                    !mappedProducts[item?.product?.slug] || // The product no longer exist.
                    item?.product?.price !==
                        parseFloat(mappedProducts[item?.product?.slug]?.price) // Or the product price has been changed.
                )
                    throw new ModelError(
                        staticTexts.orderInfoChanged,
                        false,
                        409
                    );
                return true;
            });

            const [selectResult] = await connection.execute<RowDataPacket[]>(
                `SELECT COALESCE(MAX(\`orderId\`), 0) + 1 AS \`newUniqueId\` FROM \`orders\``
            );
            if (!selectResult?.length)
                throw new ModelError(staticTexts.createOrderError, true, 500);
            const newUniqueId = selectResult[0]?.newUniqueId;

            const [insertResult] = await connection.execute<ResultSetHeader>(
                `
                INSERT INTO orders ( \`orderId\`, \`deliveryMethod\`, \`deliveryAddress\`, \`deliveryTime\`, \`deliveryNote\`, \`pickupAt\`, \`customerName\`, \`customerPhoneNumber\`, \`items\` )
                VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?);
                        `,
                [
                    `${newUniqueId}`,
                    deliveryMethod,
                    deliveryAddress || null,
                    toSQLTimestamp(parseInt(deliveryTime)) || null,
                    deliveryNote || null,
                    pickupAt || null,
                    customerName,
                    customerPhoneNumber,
                    JSON.stringify(items),
                ]
            );
            if (!insertResult.affectedRows)
                throw new ModelError(staticTexts.createOrderError, true, 500);
        });

        return new ModelResponse(staticTexts.createOrderSuccess, true, null);
    } catch (error) {
        console.error(error);
        if (error.isServerError === undefined) error.isServerError = true;

        return new ModelResponse(
            error.isServerError === false
                ? error.message
                : staticTexts.unknownError,
            false,
            null,
            error.isServerError,
            error.statusCode
        );
    }
}

/**
 * Update the order.
 * @param orderId Order id.
 * @param status Order status.
 * @returns Returns the response object.
 */
async function updateOrder(
    orderId: number,
    status?:
        | 'processing'
        | 'shipping'
        | 'completed'
        | 'refunding'
        | 'aborted'
        | 'refunded'
) {
    try {
        if (!orderId)
            throw new ModelError(
                `${staticTexts.invalidParameters}'orderId'`,
                false,
                400
            );

        if (status) {
            if (
                status !== 'processing' &&
                status !== 'shipping' &&
                status !== 'completed' &&
                status !== 'refunding' &&
                status !== 'aborted' &&
                status !== 'refunded'
            )
                throw new ModelError(
                    staticTexts.invalidOrderStatus,
                    false,
                    400
                );
        }

        await queryTransaction<void>(async (connection) => {
            const [orderResult] = await connection.execute<RowDataPacket[]>(
                `SELECT \`orderId\` FROM \`orders\` WHERE \`orderId\` = ?`,
                [`${orderId}`]
            );
            if (!orderResult.length)
                throw new ModelError(
                    `${staticTexts.orderNotFound} (${orderId})`,
                    false,
                    400
                );

            const [patchOrderResult] =
                await connection.execute<ResultSetHeader>(
                    `UPDATE \`orders\` SET \`status\` = '${status}' WHERE \`orderId\` = ?`,
                    [`${orderId}`]
                );
            if (!patchOrderResult.affectedRows)
                throw new ModelError(staticTexts.updateOrderError, true, 500);
        });

        return new ModelResponse(staticTexts.updateOrderSuccess, true, null);
    } catch (error) {
        console.error(error);
        if (error.isServerError === undefined) error.isServerError = true;

        return new ModelResponse(
            error.isServerError === false
                ? error.message
                : staticTexts.unknownError,
            false,
            null,
            error.isServerError,
            error.statusCode
        );
    }
}

/**
 * Delete order.
 * @param orderId Order id.
 * @returns Returns the response object.
 */
async function deleteOrder(orderId: number) {
    try {
        if (!orderId)
            throw new ModelError(
                `${staticTexts.invalidParameters}'orderId'`,
                false,
                400
            );

        await queryTransaction<void>(async (connection) => {
            const [orderResult] = await connection.execute<RowDataPacket[]>(
                `SELECT \`id\` FROM \`orders\` WHERE \`orderId\` = ?`,
                [`${orderId}`]
            );
            if (!orderResult.length)
                throw new ModelError(
                    `${staticTexts.orderNotFound} (${orderId})`,
                    false,
                    400
                );

            const [deleteOrderResult] =
                await connection.execute<ResultSetHeader>(
                    `DELETE FROM \`orders\` WHERE \`orderId\` = ?`,
                    [`${orderId}`]
                );
            if (!deleteOrderResult?.affectedRows)
                throw new ModelError(staticTexts.deleteOrderError, true, 500);
        });

        return new ModelResponse(staticTexts.deleteOrderSuccess, true, null);
    } catch (error) {
        console.error(error);
        if (error.isServerError === undefined) error.isServerError = true;

        return new ModelResponse(
            error.isServerError === false
                ? error.message
                : staticTexts.unknownError,
            false,
            null,
            error.isServerError,
            error.statusCode
        );
    }
}

/**
 * Restore product quantities of the order.
 * @param orderId Order id.
 * @returns Returns the response object.
 */
async function restoreProductQuantity(orderId: number) {
    try {
        if (!orderId)
            throw new ModelError(
                `${staticTexts.invalidParameters}'orderId'`,
                false,
                400
            );

        await queryTransaction<void>(async (connection) => {
            const [getOrderResult] = await connection.execute<RowDataPacket[]>(
                `SELECT * FROM \`orders\` WHERE \`orderId\` = ?`,
                [`${orderId}`]
            );
            if (!getOrderResult.length)
                throw new ModelError(
                    `${staticTexts.orderNotFound} (${orderId})`,
                    false,
                    400
                );
            let order = getOrderResult[0] as {
                id: number;
                orderId: number;
                deliveryMethod: 'pickup' | 'pickup';
                deliveryAddress: string;
                deliveryTime: Date;
                pickupAt: string;
                deliveryNote: string;
                customerName: string;
                customerPhoneNumber: string;
                items: any[];
                status:
                    | 'processing'
                    | 'shipping'
                    | 'completed'
                    | 'refunding'
                    | 'aborted'
                    | 'refunded';
                createdAt: Date;
            };

            if (order.status !== 'aborted' && order.status !== 'refunded')
                throw new ModelError(
                    staticTexts.unexpectedOrderStatusWhileRestoreQuantity,
                    false,
                    400
                );

            for (let i = 0; i < order.items.length; i++) {
                const [getCurrentProductQuantity] = await connection.execute<
                    RowDataPacket[]
                >(`SELECT \`quantity\` FROM \`products\` WHERE \`slug\` = ?`, [
                    order.items[i].product.slug,
                ]);
                if (!getCurrentProductQuantity.length) continue;
                const currentProductQuantity = getCurrentProductQuantity[0]
                        .quantity as number,
                    newProductQuantity: number =
                        currentProductQuantity + order.items[i].totalItems;
                const [updateNewProductQuantity] =
                    await connection.execute<ResultSetHeader>(
                        `UPDATE \`products\` SET \`quantity\` = ? WHERE \`slug\` = ?`,
                        [`${newProductQuantity}`, order.items[i].product.slug]
                    );
                if (!updateNewProductQuantity.affectedRows)
                    throw new ModelError(
                        staticTexts.restoreOrderProductQuantityError,
                        true,
                        500
                    );
            }
        });

        return new ModelResponse(
            staticTexts.restoreOrderProductQuantitySuccess,
            true,
            null
        );
    } catch (error) {
        console.error(error);
        if (error.isServerError === undefined) error.isServerError = true;

        return new ModelResponse(
            error.isServerError === false
                ? error.message
                : staticTexts.unknownError,
            false,
            null,
            error.isServerError,
            error.statusCode
        );
    }
}

export default {
    getOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    restoreProductQuantity,
};
