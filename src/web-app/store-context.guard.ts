import { CanActivate, ExecutionContext, Inject, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { DataService } from '../data/data.service';

export const Public = () => SetMetadata('isPublic', true);

@Injectable()
export class StoreContextGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly jwtService: JwtService,

    private dataService: DataService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [context.getHandler(), context.getClass()]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const { _parsedUrl, query } = request;

    //console.log(_parsedUrl.pathname);
    //console.log('Query:', query)

    let storeId: number | undefined;
    if ('storeId' in query) {
      request.storeId = query.storeId;

      storeId = parseInt(query.storeId, 10);
    }
    //console.log(request.user);
    request.userStore = await this.dataService.getStoreContext(request.user.user_id, storeId);
    //console.log(request.userStore)
    return true;
  }
}
