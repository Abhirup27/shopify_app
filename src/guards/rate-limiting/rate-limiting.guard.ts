import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { Observable } from 'rxjs';

// @Injectable()
// export class RateLimitingGuard implements CanActivate {
//   canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
//     return true;
//   }
// }

@Injectable()
export class RateLimitingGuard extends ThrottlerGuard {
  getJWTTracker = async (req): Promise<string> =>
  {
    return (req.headers.authorization != undefined) ? req.headers.authorization?.split(' ')[1] : null;
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    
    const { req, res } = this.getRequestResponse(requestProps.context);

    //if there are user agents (clients) to be ignored

    if (Array.isArray(this.options['ignoreUserAgents'])) {
      for (const pattern of this.options['ignoreUserAgents']) {
        if (pattern.test(req.headers['user-agent'])) {
          return true;
        }
      }
    }

    const tracker = await this.getTracker(req);
    const key = this.generateKey(requestProps.context, requestProps.throttler.name, tracker);
    
    const { totalHits, timeToExpire } = await this.storageService.increment(key, requestProps.ttl, requestProps.limit, requestProps.blockDuration, requestProps.throttler.name);

    const JWTtracker = await this.getJWTTracker(req);
    if (JWTtracker != null) {
      console.log('JWT found in header')
      const JWTKey = this.generateKey(requestProps.context, requestProps.throttler.name, JWTtracker);

      const { totalHits: totalJWTHits, timeToExpire: timeToExpireJWT } = await this.storageService.increment(JWTKey, requestProps.ttl, requestProps.limit, requestProps.blockDuration, requestProps.throttler.name);
    
      if (totalJWTHits > requestProps.limit)
      {
        res.header('Retry-After', timeToExpireJWT);

        res.type('text/plain');
        res.send('Too many requests');
        return false;
        //this.throwThrottlingException(requestProps.context,  {ttl:requestProps.ttl, limit:requestProps.limit, key:JWTKey, tracker: JWTtracker, totalHits: totalJWTHits, timeToExpire: timeToExpireJWT, isBlocked:true, timeToBlockExpire:timeToExpireJWT });
      }
    }
    if (totalHits > requestProps.limit)
    {
      //console.log(totalHits)
      res.header('Retry-After', timeToExpire);

      res.type('text/plain');
      res.send('Too many requests');
      return false;
      //this.throwThrottlingException(requestProps.context,  {ttl:requestProps.ttl, limit:requestProps.limit, key:key, tracker: tracker, totalHits: totalHits, timeToExpire: timeToExpire, isBlocked:true, timeToBlockExpire:timeToExpire });
    }

    res.header(`${this.headerPrefix}-Limit`, requestProps.limit);

    res.header(
      `${this.headerPrefix}-Remaining`,
      Math.max(0, requestProps.limit - totalHits)
    );
    res.header(`${this.headerPrefix}-Reset`, timeToExpire);

    return true;
  }
}