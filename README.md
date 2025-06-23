# shopify_app

<p align="center">
  <img src="https://img.icons8.com/?size=120&id=BRIdulMG66MK&format=png&color=000000" />
</p>
<p align="center">
<img src="https://img.icons8.com/?size=80&id=nCj4PvnCO0tZ&format=png&color=000000" alt="TypeScript"/>
<a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="80" alt="Nest" /></a>
<img src="https://img.icons8.com/?size=80&id=kg46nzoJrmTR&format=png&color=000000" alt="ExpressJS"/>
<img src="https://img.icons8.com/?size=80&id=Pv4IGT0TSpt8&format=png&color=000000" alt="PostgreSQL"/>
<img src="https://img.icons8.com/?size=80&id=KRA1PoZgRrca&format=png&color=000000" alt="GraphQL"/>
<img src="https://img.icons8.com/?size=80&id=lhwQTv6iwznO&format=png&color=000000" alt="GraphQL"/>
</p>

## Description

A shopify stores management app.

## Project setup

```bash
$ npm install

# generate graphql types
$ npm run graphql:types
```

### Environment file config:

.env.development:

```
# use .env.development for development environments

PORT=3000
APP_SECRET=9d6a1925450ba0f4815bfa0860127fbe

API_VERSION=2024-07
API_SECRET=<shopify app client secret>
API_KEY=<shopify app client ID>

APP_URL=https://rnxxf-223-233-71-49.a.free.pinggy.link

CSRF_SECRET=v123er$%123ylongtex123t

JWT_SECRET=df411400674f6d54db83d1a050e6ae6b018d750e36a615c332e1861bb0f22e36
JWT_TOKEN_AUDIENCE=https://d1a4-223-233-67-231.ngrok-free.app
JWT_TOKEN_ISSUER=localhost:3000
JWT_ACCESS_TOKEN_TTL=3600
#Enable all logging
#LOGGING=true

# Enable file logging
LOG_TO_FILE=true

# Or enable specific log levels
LOGGING=debug,error,warn,log

DB_TYPE=postgres
DB_PORT=5432
DB_USERNAME=<DB_USERNAME>
DB_PASSWORD=<PASSWORD>
DB_HOST="localhost"
DB_NAME="shopify_app"
DB_SYNC="false"
DB_AUTOLOAD="true"
DB_RUN_MIGRATIONS="false"
REDIS_HOST=localhost
REDIS_PORT=6379


# Stripe related config
STRIPE_API_KEY=
STRIPE_API_SECRET=

```
edit ./src/config/configuration.ts:
```typescript
  app_url: 'https://xyz.com',
  app_install_URL: 'https://xyz.com/shopify/auth/redirect',
  refresh_token_URL: 'https://xyz.com/shopify/auth/updateStoreToken',
```
Add these routes to your allowed redirection URLs:

\*/shopify/auth/updateStoreToken

\*/shopify/auth/redirect

## Compile and run the project

```bash
# development watch mode
$ npm run start:dev

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## View Documentation

```bash
# install compodoc
$ npm install -g @compodoc/compodoc

# build and serve documentation
npm run doc

```

go to http://127.0.0.1:3001

# Checklist and To-Do
### Done
- [x] View Products.
- [x] Sync Products.
- [x] Create Products.
- [x] View and Sync Orders.
- [x] View team store's team members.
- [x] Create new members with privileges.
- [x] Billing and consuming credits.
### To be done
- [ ] Add private stores.
- [ ] Fulfill paid orders.
### What I might do
- [ ] Add subscriptions/ stripe gateway (to charge private app usage).
- [ ] Edit customer, product, order details
## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```