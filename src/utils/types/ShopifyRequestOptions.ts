import { AxiosHeaders } from 'axios';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export interface ShopifyRequestOptions {
  data?: Record<string, JsonValue> | string | object;
  url: string;
  headers: AxiosHeaders;
}
