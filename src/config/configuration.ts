
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  logging:process.env.LOGGING,
  logToFile: process.env.LOG_TO_FILE,

  app_install_URL:'https://5aee-223-233-68-44.ngrok-free.app/shopify/auth/redirect',

  shopify_api_version: '2024-01',
  shopify_api_key:process.env.API_KEY,
  shopify_api_secret:process.env.API_SECRET,
  shopify_api_scopes: 'read_products,write_products,read_orders,write_orders',
  shopify_embedded_app: false,
  
  jwt_secret: process.env.JWT_SECRET ?? 'randomstring',
  jwt_token_audience: process.env.JWT_TOKEN_AUDIENCE ?? 'https://5aee-223-233-68-44.ngrok-free.app',
  jwt_token_issuer: process.env.JWT_TOKEN_ISSUER,
  jwt_access_token_ttl: parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '3600', 10),

  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 3306
  }
});
