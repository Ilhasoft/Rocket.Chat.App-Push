import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiEndpoint, IApiEndpointInfo, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';
import { PUSH_BASE_URL, PUSH_CLOSED_FLOW, PUSH_MEDIA_FLOW, PUSH_TOKEN } from '../settings/Constants';
import { RapidproUtils } from '../utils/RapidproUtils';

export class RocketEndpoint extends ApiEndpoint {
    public path = 'rocket/webhook';

    public async post(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ): Promise<IApiResponse> {

        const baseUrl = await read.getEnvironmentReader().getSettings().getValueById(PUSH_BASE_URL);
        const authToken = await read.getEnvironmentReader().getSettings().getValueById(PUSH_TOKEN);
        const closeTicket = await read.getEnvironmentReader().getSettings().getValueById(PUSH_CLOSED_FLOW);
        const mediaTicket = await read.getEnvironmentReader().getSettings().getValueById(PUSH_MEDIA_FLOW);

        const rapidProUtils = new RapidproUtils(read, http, baseUrl, authToken, closeTicket, mediaTicket);

        const rc = request.content;
        console.log('Request Content Object: ', rc);

        const data = {
            visitor: rc.visitor,
            agent: rc.agent,
            contactUuid: rc.visitor.customFields.contactUuid,
            token: rc.visitor.token,
            type: rc.type,
            tags: rc.tags,
            messages: rc.messages,
        };

        let contacts;
        if (data.contactUuid) {
            contacts = [data.contactUuid];
        } else {
            contacts = [data.token];
        }

        // TODO: Check if serialization is necessary

        if (data.type === 'Message') {
            await rapidProUtils.broadcastMessages(data.messages, contacts);
        } else if (data.type === 'LivechatSession') {
            const extra = {
                agent: data.agent,
                livechat: data,
            };
            await rapidProUtils.closeSession(extra, contacts);
        }

        return this.success();
    }

}
