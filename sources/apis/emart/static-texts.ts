/**
 * @file static-texts.ts
 * @description Static text used by E-Mart api.
 */

'use strict';

const staticTexts = {
    unknownError: 'Unknown server error occurred.',
    maintenanceError: 'Server under maintenance. Please try again later.',
    slugGenerateError: 'Error creating slug.',
    fileNameGenerateError: 'Error creating file name.',
    invalidParameters: 'Missing required parameters: ',
    invalidEmail: 'The email address is invalid (Only Gmail is supported).',
    invalidUsernameCharacters:
        'The username contains invalid characters. [a-zA-Z0-9]',
    invalidUsernameLength:
        'The username must be at least 6 characters and a maximum of 16 characters.',
    invalidPasswordLength:
        'The password must be at least 8 characters and a maximum of 32 characters.',
    invalidResetPasswordRequest: 'Invalid request.',
    invalidUpdateUserInfoRequest: 'Invalid request.',
    invalidUpdateEmailRequest: 'Invalid request.',
    invalidUpdatePasswordRequest: 'Invalid request.',
    invalidDeleteAccountRequest: 'Invalid request.',
    invalidShippingMethod:
        "The delivery method must be either 'shipping' or 'pickup'.",
    invalidOrderStatus: 'Invalid order status.',
    invalidUsernameOrPassword: 'The username or password is incorrect.',
    invalidImageFileType: 'The file format is not an image.',
    invalidRequest: 'Invalid request.',
    expiredRequest: 'This request has expired.',
    invalidToken: 'Invalid token.',
    tokenExpired: 'Token expired.',
    fileExceedLimit: 'The number of files or file size exceeds the limit.',
    verifyTokenSuccess: 'Token verified successfully.',
    authorizeSuccess: 'Logged in successfully.',
    deauthorizeSuccess: 'Logged out successfully.',
    getDataSuccess: 'Data retrieved successfully.',
    categoryNotFound: 'Category not found.',
    createCategorySuccess: 'Category created successfully.',
    createCategoryError: 'Failed to create the category.',
    updateCategorySuccess: 'Category updated successfully.',
    deleteCategorySuccess: 'Category deleted successfully.',
    deleteCategoryError: 'Failed to delete the category.',
    uploadImageSuccess: 'Image uploaded successfully.',
    subscribeNewsletterEmailSubject: 'Subscrible Newsletter Confirmation',
    subscribeNewsletterEmailLinkText:
        'Click on this link to confirm your subscription request.',
    subscribeNewsletterSuccess: 'Check your email to confirm your request.',
    subscribeNewsletterConfirmationError:
        'Error occurred while confirming the request.',
    subscribeNewsletterConfirmationSuccess:
        'Successfully subscribed to the newsletter.',
    orderNotFound: 'Order not found.',
    orderNeedUpdate: 'Order information needs to be updated.',
    orderInfoChanged: 'Order information changed.',
    createOrderError: 'Failed to create the order.',
    createOrderSuccess: 'Order created successfully.',
    updateOrderError: 'Failed to update the order.',
    updateOrderSuccess: 'Order updated successfully.',
    deleteOrderError: 'Failed to delete the order.',
    deleteOrderSuccess: 'Order deleted successfully.',
    unexpectedOrderStatusWhileRestoreQuantity:
        'The order status must be: Refunded or Canceled.',
    restoreOrderProductQuantityError: 'Failed to restore product quantity.',
    restoreOrderProductQuantitySuccess:
        'Order product quantity restored successfully.',
    productNotFound: 'Product not found.',
    productInvalidCategory: 'Invalid product categories.',
    createProductError: 'Failed to create the product.',
    createProductSuccess: 'Product created successfully.',
    updateProductError: 'Failed to update the product.',
    updateProductSuccess: 'Product updated successfully.',
    deleteProductError: 'Failed to delete the product.',
    deleteProductSuccess: 'Product deleted successfully.',
    forgotPasswordError:
        'Error occurred while executing forgot password request.',
    forgotPasswordSuccess: 'Check your email to reset your password.',
    forgotPasswordEmailSubject: 'Forgot Your Password?',
    forgotPasswordEmailLinkText: 'Click this link to recover your account.',
    resetPasswordTokenMissing: 'No recovery token has been provided.',
    resetPasswordNewPasswordMissing: 'No new password has been provided.',
    resetPasswordError:
        'Error occurred while executing reset password request.',
    resetPasswordSuccess: 'Password updated successfully.',
    invalidRegisterInformation: 'Invalid register information.',
    registerError: 'Failed to register',
    registerSuccess: 'Registered successfully',
    getUserInfoError: 'Failed to get the user info.',
    UpdateEmailAddressEmailSubject: 'Update Email Address',
    UpdateEmailAddressEmailLinkText:
        'Click on this link to update your email address.',
    updateUserInfoSuccess: 'User info updated successfully.',
    updateEmailTokenMissing: 'No update email token has been provided.',
    updateEmailSuccess: 'Email address updated successfully.',
    updateEmailError: 'Failed to update the email address.',
    updatePasswordNewMatchOld: 'New password matches old password.',
    updatePasswordIncorrectOldPassword: 'The current password is incorrect.',
    updatePasswordSuccess: 'Password updated successfully.',
    updatePasswordError: 'Failed to update the password.',
    deleteUserIncorrectPassword: 'The password is incorrect.',
    deleteUserSuccess: 'User deleted successfully.',
    deleteUserError: 'Failed to delete the user.',
    userNotFound: 'User not found.',
    updateUserAsAdminError: 'Failed to update the user.',
    updateUserAsAdminSuccess: 'User updated successfully.',
    emailAlreadyExist: 'This email address is already exist.',
    usernameAlreadyExist: 'This username is already exist.',
} as const;

export default staticTexts;
