import { CreateShopDTO } from 'src/installation/dtos/create-store.dto';

//export type CreateShopDTOType = InstanceType<typeof CreateShopDTO>;
//export type CreateShopDTOWithIndex = CreateShopDTOType & {
// [key: string]: ResponseBodyType | undefined;
//};

export type ResponseBodyType =
  | string
  | number
  | boolean
  | null
  | ResponseBodyType[]
  | { [key: string]: ResponseBodyType };

export type ShopifyResponse<T extends ResponseBodyType = ResponseBodyType> = {
  status: boolean;
  error?: boolean;
  respBody: T;
  statusCode?: number;
};
