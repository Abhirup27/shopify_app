import { registerAs } from '@nestjs/config';

/**
 * A new confiruation referenced by the name routes. Returns a key value pair object which is used in the RouteService provider.
 * */
export default registerAs('routes', (): Record<string, string> => {
  return {
    home: '/dashboard',
    login: '/',
    logout: '/logout',
    'stores.index': '/stores',
    'stores.create': '/stores/create',

    'billing.index': '/billing',

    show2FASettings: '/auth-settings',

    'shopify.order': '/order',
    'shopify.orders': '/orders',
    'shopify.products': '/products',
    'shopify.customers': '/customers',
    'real.time.notifications': '/notifications',

    'orders.sync': '/syncOrders',
    'locations.sync': '/syncStoreLocations',

    'product.add.variant': '/productAddVariant',
    'shopify.product.create': '/productCreate',
    'shopify.product.publish': '/productPublish',
    'shopify.products.sync': '/syncProducts',
    'change.product.addToCart': '/product/cart',

    'members.index': '/members',
    'members.create': '/createMember',
    'members.register': '/memberRegister',
  };
});
