import { registerAs } from "@nestjs/config";

export default registerAs('routes', (): Record<string, string> => {
    return {
        'home': '/dashboard',
        'login': '/',
        'logout': '/logout',
        'stores.index': '/stores',
        'stores.create': '/stores/create',

        'shopify.orders': '/orders',
        'shopify.products': '/products',
        'shopify.customers': '/customers',
        'real.time.notifications': '/notifications',
    };
});