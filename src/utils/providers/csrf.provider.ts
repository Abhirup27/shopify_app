import { Injectable } from '@nestjs/common';
import { CsrfTokenCreator, doubleCsrf, DoubleCsrfConfigOptions, DoubleCsrfUtilities } from 'csrf-csrf';
import { Request, Response } from 'express';


@Injectable()
export class CsrfProvider {
    private config: DoubleCsrfConfigOptions
    private utilities: DoubleCsrfUtilities;

    //right now it just picks it up from the .env
    constructor() {
        //console.log(process.env.CSRF_SECRET)
        this.config = {
            getSecret: () => process.env.CSRF_SECRET,
            cookieName: 'x-csrf-token',
            cookieOptions: {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                signed: false
            },
            size: 64,
            getTokenFromRequest: (req) => req.headers['x-csrf-token'],
        };

        this.utilities = doubleCsrf(this.config);
    }

    getUtilities = (): DoubleCsrfUtilities => {
        return this.utilities;
    }
    getGenerateToken = (): Function => {
        return this.utilities.generateToken;
    }
    generateToken = (req: Request, res: Response): string => {

        //console.log(this.config.getSecret())
        return this.utilities.generateToken(req, res);
    }
}
