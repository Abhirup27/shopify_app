import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosHeaders, Method } from 'axios';
import { ShopifyResponse } from 'src/types/ShopifyResponse';

/**
 * Alternate requestToShopify function that can be used in utils.service. Not used.
 */
@Injectable()
export class RequestToShopifyProvider {

     constructor(
            private readonly httpService: HttpService
        )
        { }
     public  requestToShopify = async (method: Method, endpoint: string, headers: AxiosHeaders, payload: Record<string, any>): Promise<ShopifyResponse> =>
    {
        const reqResult: ShopifyResponse = { status: false , respBody: null}
        const axiosMethod = this.httpService[method];
       this.httpService.request
        try {
            if (!axiosMethod)
            {
                 throw new Error(`Unsupported method: ${method}`);
            }

            const options = { headers: headers };

            if (method.toLowerCase() === 'get' || method.toLowerCase() === 'delete')
            {
                reqResult.respBody = await axiosMethod(endpoint, options);
                reqResult.status = true;
            }
            else if (['post', 'put', 'patch'].includes(method.toLowerCase()))
            {
                reqResult.respBody = await axiosMethod(endpoint, payload, options);
                reqResult.status = true;
            }

            return reqResult;
        }
        catch (error)
        {
            //reqResult.respBody["error"] = true;
            //log to file
            reqResult.error = true;
            console.log(error.message);

            if (error.response)
            { 
                reqResult.respBody = error.response.data;
                reqResult.statusCode = error.response.status;
                return reqResult;
            }

            reqResult.respBody = error.message;
            return reqResult;
        }
    }
}
