/**
 * @file order.ts
 * @description Order router models.
 */

'use strict';

import { query, queryTransaction } from '@sources/services/database';
import {
    ModelError,
    ModelResponse,
    getOffset,
    toSQLTimestamp,
} from '@sources/utility/model';

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

/**
 * Get orders.
 * @param page Pagination.
 * @param itemPerPage Item per page.
 * @returns Returns the response object.
 */
async function getOrders(page: number = 1, itemPerPage: number = 12) {
    try {
        const offset = getOffset(page, itemPerPage);

        const itemsQueryResult = await query(
                `SELECT orderId, deliveryMethod, deliveryAddress, deliveryTime, pickupAt, deliveryNote, customerName, customerPhoneNumber, items, status, createdAt FROM orders LIMIT ?, ?`,
                [`${offset}`, `${itemPerPage}`]
            ),
            orders = itemsQueryResult || [];

        const totalItemsQueryResult = await query(
                `SELECT COUNT(*) AS total_items from \`orders\``
            ),
            totalOrders = (totalItemsQueryResult as any[])[0].total_items;

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

        return new ModelResponse('Truy xuất dữ liệu thành công.', true, {
            meta,
            orders,
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
                `Thông tin 'deliveryMethod', 'customerName', 'customerPhoneNumber', 'items' bị thiếu.`,
                false,
                400
            );

        if (deliveryMethod !== 'shipping' && deliveryMethod !== 'pickup')
            throw new ModelError(
                `Phương thức thanh toán phải là 'shipping' hoặc 'pickup'.`,
                false,
                400
            );

        if (deliveryMethod === 'shipping' && !deliveryAddress)
            throw new ModelError(
                `Thông tin 'deliveryAddress' bị thiếu.`,
                false,
                400
            );

        if (deliveryMethod === 'pickup' && !pickupAt)
            throw new ModelError(`Thông tin 'pickupAt' bị thiếu.`, false, 400);

        if (!Array.isArray(items) || !items.length)
            throw new ModelError(`Thông tin 'items' không hợp lệ.`, false, 400);

        await queryTransaction(async (connection) => {
            // Reject the request if the cart product items information is not matches the
            // information in the database.
            const sqlCondition = items?.map(() => `slug = ?`).join(' OR '),
                params = items?.map((item) => item?.product?.slug);
            const [getProductsResult] = (await connection.execute(
                `SELECT \`slug\`, \`price\`, \`quantity\` FROM \`products\` WHERE ${sqlCondition}`,
                params
            )) as Array<Array<any>>;
            const mappedProducts = getProductsResult?.reduce((acc, product) => {
                acc[product?.slug] = product;
                return acc;
            }, {});

            for (let i = 0; i < items.length; i++) {
                const [currentQuantityResult] = (await connection.execute(
                    `SELECT \`quantity\` FROM \`products\` WHERE BINARY \`slug\` = ?`,
                    [items[i].product.slug]
                )) as Array<any>;
                if (!currentQuantityResult.length)
                    throw new ModelError(
                        'Thông tin đơn hàng cần được cập nhật mới.',
                        false,
                        409
                    );

                const currentQuantity = currentQuantityResult[0].quantity,
                    newQuantity = currentQuantity - items[i].totalItems;
                if (newQuantity < 0)
                    throw new ModelError(
                        'Thông tin đơn hàng cần được cập nhật mới.',
                        false,
                        409
                    );
                const [updateItemQuantity] = (await connection.execute(
                    `UPDATE \`products\` SET \`quantity\` = ? WHERE BINARY slug = ?`,
                    [`${newQuantity}`, items[i].product.slug]
                )) as Array<any>;
                if (!updateItemQuantity.affectedRows)
                    throw new ModelError(
                        'Cập nhật số lượng hàng thất bại (products).',
                        true,
                        500
                    );
            }

            items?.every((item) => {
                if (
                    !mappedProducts[item?.product?.slug] || // The product no longer exist.
                    item?.product?.price !==
                        mappedProducts[item?.product?.slug]?.price // Or the product price has been changed.
                )
                    throw new ModelError(
                        'Thông tin đơn hàng đã bị thay đổi.',
                        false,
                        409
                    );
                return true;
            });

            const [selectResult] = (await connection.execute(
                `SELECT COALESCE(MAX(\`orderId\`), 0) + 1 AS \`newUniqueId\` FROM \`orders\``
            )) as Array<any>;
            if (!selectResult?.length)
                throw new ModelError(
                    `Có lỗi xảy ra khi cố gắng tạo id cho đơn hàng.`,
                    true,
                    500
                );
            const newUniqueId = selectResult[0]?.newUniqueId;

            const [insertResult] = (await connection.execute(
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
            )) as Array<any>;
            if (!insertResult.affectedRows)
                throw new ModelError(
                    'Thêm đơn hàng vào cơ sở dữ liệu thất bại (orders).',
                    true,
                    500
                );

            return insertResult;
        });

        return new ModelResponse('Thành công.', true, null);
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
            throw new ModelError(`Thông tin 'orderId' bị thiếu.`, false, 400);

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
                    'Trạng thái đơn hàng không hợp lệ',
                    false,
                    400
                );
        }

        await queryTransaction(async (connection) => {
            const [orderResult] = (await connection.execute(
                `SELECT \`orderId\` FROM \`orders\` WHERE \`orderId\` = ?`,
                [`${orderId}`]
            )) as Array<any>;
            if (!orderResult.length)
                throw new ModelError('Đơn hàng không tồn tại.', false, 400);

            const [patchOrderResult] = (await connection.execute(
                `UPDATE \`orders\` SET \`status\` = '${status}' WHERE \`orderId\` = ?`,
                [`${orderId}`]
            )) as Array<any>;
            if (!patchOrderResult.affectedRows)
                throw new ModelError(
                    'Có lỗi xảy ra khi cập nhật dữ liệu đơn hàng.',
                    true,
                    500
                );

            return orderResult;
        });

        return new ModelResponse('Thành công.', true, null);
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
 * Delete order.
 * @param orderId Order id.
 * @returns Returns the response object.
 */
async function deleteOrder(orderId: number) {
    try {
        if (!orderId)
            throw new ModelError(`Thông tin 'orderId' bị thiếu.`, false, 400);

        await queryTransaction(async (connection) => {
            const [orderResult] = (await connection.execute(
                `SELECT \`id\` FROM \`orders\` WHERE \`orderId\` = ?`,
                [`${orderId}`]
            )) as Array<any>;
            if (!orderResult.length)
                throw new ModelError(
                    `Đơn hàng '${orderId}' không tồn tại.`,
                    false,
                    400
                );

            const [deleteOrderResult] = (await connection.execute(
                `DELETE FROM \`orders\` WHERE \`orderId\` = ?`,
                [`${orderId}`]
            )) as Array<any>;
            if (!deleteOrderResult?.affectedRows)
                throw new ModelError(
                    `Có lỗi xảy ra khi xoá đơn hàng.`,
                    true,
                    500
                );

            return deleteOrderResult;
        });

        return new ModelResponse('Xoá đơn hàng thành công.', true, null);
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
 * Restore product quantities of the order.
 * @param orderId Order id.
 * @returns Returns the response object.
 */
async function restoreProductQuantity(orderId: number) {
    try {
        if (!orderId)
            throw new ModelError(`Thông tin 'orderId' bị thiếu.`, false, 400);

        await queryTransaction(async (connection) => {
            const [getOrderResult] = (await connection.execute(
                `SELECT * FROM \`orders\` WHERE \`orderId\` = ?`,
                [`${orderId}`]
            )) as Array<Array<any>>;
            if (!getOrderResult.length)
                throw new ModelError(
                    `Đơn hàng '${orderId}' không tồn tại.`,
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
                    `Trạng thái đơn hàng phải là: Đã hoàn tiền hoặc Đã huỷ`,
                    false,
                    400
                );

            for (let i = 0; i < order.items.length; i++) {
                const [getCurrentProductQuantity] = (await connection.execute(
                    `SELECT \`quantity\` FROM \`products\` WHERE \`slug\` = ?`,
                    [order.items[i].product.slug]
                )) as Array<Array<any>>;
                if (!getCurrentProductQuantity.length) continue;
                const currentProductQuantity = getCurrentProductQuantity[0]
                        .quantity as number,
                    newProductQuantity: number =
                        currentProductQuantity + order.items[i].totalItems;
                const [updateNewProductQuantity] = (await connection.execute(
                    `UPDATE \`products\` SET \`quantity\` = ? WHERE \`slug\` = ?`,
                    [`${newProductQuantity}`, order.items[i].product.slug]
                )) as Array<any>;
                if (!updateNewProductQuantity.affectedRows)
                    throw new ModelError(
                        `Có lỗi xảy ra khi cập nhật số lượng sản phẩm (orders).`,
                        true,
                        500
                    );
            }

            return getOrderResult;
        });

        return new ModelResponse('Thành công.', true, null);
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
    getOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    restoreProductQuantity,
};
