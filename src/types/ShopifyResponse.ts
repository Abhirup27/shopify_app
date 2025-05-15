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
  | { [key: string]: ResponseBodyType | object };

export type ShopifyResponse<T extends ResponseBodyType = ResponseBodyType> = {
  status: boolean;
  error?: boolean;
  respBody: T;
  statusCode?: number;
};
