/**
 * @file types.ts
 * @description API classes and types.
 */

'use strict';

// Raw API responses.
export class RawAPIResponse<ResponseData> {
    message: string;
    success: boolean;
    data: ResponseData | null;

    /**
     * Construct a raw API response object.
     * @param message Specifies the response message.
     * @param success Specifies whether the API action is successful.
     * @param data Specifies the response associated data.
     */
    constructor(message: string, success: boolean, data: ResponseData = null) {
        this.message = message;
        this.success = success;
        this.data = data || null;
    }
}

// Standardized API responses.
export class APIResponse<ResponseData> extends RawAPIResponse<ResponseData> {
    statusCode: number;

    /**
     * Construct a Transformed API response object.
     * @param message Specifies the response message.
     * @param success Specifies whether the API action is successful.
     * @param data Specifies the response associated data.
     * @param statusCode Specifies the HTTP status code.
     */
    constructor(
        message: string,
        success: boolean,
        data: ResponseData | null = null,
        statusCode?: number
    ) {
        super(message, success, data);
        this.statusCode = statusCode || success ? 200 : 400;
    }
}

// API function.
export type APIFunction<ResponseData> = (
    ...args: any[]
) => Promise<APIResponse<ResponseData>>;

// Business logic types:

export type RawProduct = {
    slug: string;
    name: string;
    category: string[];
    desc: string;
    price: number;
    imageFileName: string;
    quantity: number;
    priority: number;
};

export type Product = {
    slug: string;
    name: string;
    category: string[];
    desc: string;
    price: number;
    imageFileName: string;
    quantity: number;
    priority: number;
};

export type RawOrder = {
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

export type Order = {
    orderId: number;
    deliveryMethod: 'shipping' | 'pickup';
    deliveryAddress: string;
    deliveryTime: Date;
    pickupAt: string;
    deliveryNote: string;
    customerName: string;
    customerPhoneNumber: string;
    items: CartItem[];
    status:
        | 'processing'
        | 'shipping'
        | 'completed'
        | 'refunding'
        | 'aborted'
        | 'refunded';
    createdAt: Date;
};

export type RawUser = {
    username: string;
    email: string;
    role: string;
    avatarFileName: string;
    createdAt: string;
};

export type User = {
    username: string;
    email: string;
    role: string;
    avatarFileName: string;
    createdAt: Date;
};

export type CartItem = {
    id: number;
    product: Product;
    totalItems: number;
    note: string;
};

export type RawCategory = {
    slug: string;
    name: string;
    desc: string;
    imageFileName: string;
    priority: number;
};

export type Category = RawCategory;

// Response data types:

export type RegisterResponseData = null;
export type AuthorizeResponseData = {
    username: string;
    email: string;
    role: string;
    avatarFileName: string;
};
export type DeauthorizeResponseData = null;
export type RefreshTokensResponseData = {
    refreshToken: string;
    accessToken: string;
};
export type VerifySessionResponseData = {
    username: string;
    email: string;
    role: string;
    avatarFileName: string;
};
export type ForgotPasswordResponseData = null;
export type ResetPasswordResponseData = null;
export type UploadUserAvatarResponseData = null;
export type GetUserInfoResponseData = {
    username: string;
    email: string;
    role: string;
    avatarFileName: string;
    createdAt: string;
};
export type UpdateUserInfoResponseData = null;
export type UpdateEmailAddressResponseData = null;
export type UpdatePasswordResponseData = null;
export type DeleteUserResponseData = null;
export type GetUsersAsAdminResponseData = {
    meta: {
        page: number;
        itemPerPage: number;
        totalItems: number;
        isFirstPage: boolean;
        isLastPage: boolean;
        prevPage: string;
        nextPage: string;
    };
    users: RawUser[];
};
export type CreateUserAsAdminResponseData = null;
export type UpdateUserAsAdminResponseData = null;
export type DeleteUserAsAdminResponseData = null;
export type UploadUserAvatarAsAdminResponseData = null;
export type GetProductsResponseData = {
    meta: {
        page: number;
        itemPerPage: number;
        totalItems: number;
        isFirstPage: boolean;
        isLastPage: boolean;
        prevPage: string;
        nextPage: string;
    };
    products: RawProduct[];
};
export type CreateProductResponseData = null;
export type UpdateProductResponseData = null;
export type DeleteProductResponseData = null;
export type UploadProductImageResponseData = null;
export type GetCategoriesResponseData = {
    meta: {
        page: number;
        itemPerPage: number;
        totalItems: number;
        isFirstPage: boolean;
        isLastPage: boolean;
        prevPage: string;
        nextPage: string;
    };
    categories: RawCategory[];
};
export type GetCategoriesCountResponseData = Array<{
    slug: string;
    count: number;
}>;
export type CreateCategoryResponseData = null;
export type UpdateCategoryResponseData = null;
export type DeleteCategoryResponseData = null;
export type UploadCategoryImageResponseData = null;
export type GetOrdersResponseData = {
    meta: {
        page: number;
        itemPerPage: number;
        totalItems: number;
        isFirstPage: boolean;
        isLastPage: boolean;
        prevPage: string;
        nextPage: string;
    };
    orders: RawOrder[];
};
export type CreateOrderResponseData = null;
export type UpdateOrderResponseData = null;
export type DeleteOrderResponseData = null;
export type RestoreProductQuantityResponseData = null;
export type SubscribeNewsletterResponseData = null;
export type SubscribeNewsletterConfirmationResponseData = null;
