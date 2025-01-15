
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type ShopifyResponse = {
    "status": boolean,
    "error"?: boolean,
    "respBody": JsonValue,
    "statusCode"?: number
}
