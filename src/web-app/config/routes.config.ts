import { registerAs } from "@nestjs/config";

export default registerAs('routes', (): Record<string, string> => {
    return {
        'home': '/dashboard',
        'login': '/',
        'logout': '/logout',
        'stores.index': '/stores',
        'stores.create': '/stores/create',

        'billing.index': '/billing',

        'show2FASettings': '/auth-settings',

        'shopify.order': '/order',
        'shopify.orders': '/orders',
        'shopify.products': '/products',
        'shopify.customers': '/customers',
        'real.time.notifications': '/notifications',

        'orders.sync': '/syncOrders',


        'members.index': '/members',
        'members.create': '/createMember',
        'members.register': '/memberRegister',
    };
});
