interface WebhookEventMapping {
  [key: string]: string;
}

const webhookEvents: WebhookEventMapping = {
  'orders/create': 'order/created',     // When the store receives an order
  'orders/updated': 'order/updated',    // When an order is updated
  'products/create': 'product/created', // When products are created
  'app/uninstalled': 'app/uninstall',   // To know when the app has been removed
  'shop/update': 'shop/updated'         // To keep latest data in the stores table
};

export default webhookEvents;