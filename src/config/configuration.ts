
export default () => ({

  environment: process.env.NODE_ENV || 'production',

  port: parseInt(process.env.PORT, 10) || 3000,
  logging:process.env.LOGGING,
  logToFile: process.env.LOG_TO_FILE,

  app_secret: process.env.APP_SECRET,
  app_url:'https://39fb-223-233-69-214.ngrok-free.app',
  app_install_URL:'https://39fb-223-233-69-214.ngrok-free.app/shopify/auth/redirect',

  shopify_api_version: '2024-01',
  shopify_api_key:process.env.API_KEY,
  shopify_api_secret:process.env.API_SECRET,
  shopify_api_scopes: 'read_products,write_products,read_orders,write_orders',
  shopify_embedded_app: false,

  accessScopes: [
    'read_products',
    'write_products',
    'read_orders',
    'write_orders',
    'read_customers',
    'write_customers',
    
  ].join(','),
  
  jwt_secret: process.env.JWT_SECRET ?? 'randomstring',
  jwt_token_audience: process.env.JWT_TOKEN_AUDIENCE ?? 'https://39fb-223-233-69-214.ngrok-free.app',
  jwt_token_issuer: process.env.JWT_TOKEN_ISSUER,
  jwt_access_token_ttl: parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '3600', 10),

  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    type:  process.env.DB_TYPE.toString(),
    name: process.env.DB_NAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    synchronize: process.env.DB_SYNC === 'true' ? true : false,
    autoload: process.env.DB_AUTOLOAD === 'true' ? true : false,
  },

  redis: {
    host: process.env.REDIS_HOST.toString() ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10) 
  },


  webhooks: [
  'orders/create',   
  'orders/updated',    
  'products/create',
  "products/update",
  "products/delete",
  "app_subscriptions/update",
  'app/uninstalled',
  'shop/update',
  "customers/create"
  ]
});
