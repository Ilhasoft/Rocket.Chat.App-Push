import { HttpStatusCode } from '@rocket.chat/apps-engine/definition/accessors';
import { IApiResponse } from '@rocket.chat/apps-engine/definition/api';

export function httpErrorResponse(status: HttpStatusCode, content: string): IApiResponse {
    return {
        status,
        content: {content},
    };
}
