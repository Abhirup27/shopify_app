
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  logging:process.env.LOGGING,
  logToFile: process.env.LOG_TO_FILE,

  app_install_URL:'https://0023-223-233-68-44.ngrok-free.app/shopify/auth/redirect',

  shopify_api_version: '2024-01',
  shopify_api_key:process.env.API_KEY,
  shopify_api_secret:process.env.API_SECRET,
  shopify_api_scopes: 'read_products,write_products,read_orders,write_orders',
  shopify_embedded_app: false,
  
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 3306
  }
});
