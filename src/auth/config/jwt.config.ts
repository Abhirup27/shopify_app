// import { registerAs } from "@nestjs/config";
// import { JwtModuleAsyncOptions, JwtModuleOptions } from "@nestjs/jwt";

// export default registerAs('jwt', ():JwtModuleOptions => {
//     return {
//         secret: process.env.JWT_SECRET ?? 'randomstring',
//         jwt_token_audience: process.env.JWT_TOKEN_AUDIENCE ?? 'https://5aee-223-233-68-44.ngrok-free.app',
//         jwt_token_issuer: process.env.JWT_TOKEN_ISSUER,
//         jwt_access_token_ttl: parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '3600', 10),
//     }
// });

import { registerAs } from "@nestjs/config";
import { JwtModuleAsyncOptions, JwtModuleOptions } from "@nestjs/jwt";

export default registerAs('jwt', ():JwtModuleOptions => {
    return {
        secret: process.env.JWT_SECRET ?? 'randomstring',
        signOptions:  
        {            
        audience: process.env.JWT_TOKEN_AUDIENCE ?? 'https://cbe3-223-233-69-214.ngrok-free.app',
        issuer: process.env.JWT_TOKEN_ISSUER,
        expiresIn: parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '3600', 10)
        },

    }
});
