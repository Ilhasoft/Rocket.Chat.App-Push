import { HttpStatusCode, IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiEndpoint, IApiEndpointInfo, IApiRequest } from '@rocket.chat/apps-engine/definition/api';
import { IApiResponseJSON } from '@rocket.chat/apps-engine/definition/api/IResponse';
import { REQUEST_TIMEOUT } from '../settings/Constants';
import { RapidproUtils } from '../utils/RapidproUtils';
import { RocketUtils } from '../utils/RocketUtils';

export class ReceiveMessageEndpoint extends ApiEndpoint {
    public path = 'message/webhook';

    public async get(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ): Promise<IApiResponseJSON> {

        const xauth = request.headers['x-auth-token'];
        const xuser = request.headers['x-user-id'];
        const siteUrl = await read.getEnvironmentReader().getServerSettings().getValueById('Site_Url');
        const timeoutValue = await read.getEnvironmentReader().getSettings().getValueById(REQUEST_TIMEOUT);
        const rocketUtils = new RocketUtils(read, http, xauth, xuser, siteUrl, timeoutValue);

        const token = request.query.token;
        const roomId = request.query.roomId;
        const message = request.query.msg;

        const sendMessageResponse = await this.sendVisitorMessage(rocketUtils, token, roomId, message);

        return sendMessageResponse;
    }

    public async sendVisitorMessage(rocketUtils, token, roomId, message): Promise<IApiResponseJSON> {

        if (!roomId) {
            const roomResponse = await rocketUtils.createRoom(token);
            if (roomResponse.statusCode !== 200) {
                return roomResponse;
            }
            roomId = roomResponse.data.room._id;
        }

        const visitorMessageResponse = await this.createVisitorMessage(rocketUtils, token, roomId, message);

        return visitorMessageResponse;
    }

    public async createVisitorMessage(rocketUtils, token, roomId, message): Promise<IApiResponseJSON> {

        const createdMessage = await rocketUtils.createVisitorMessage(token, roomId, message);

        const messageResponse: IApiResponseJSON = {
            status: HttpStatusCode.OK,
            content: createdMessage.data,
        };

        return messageResponse;
    }

}
