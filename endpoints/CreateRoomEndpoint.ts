import { HttpStatusCode, IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiEndpoint, IApiEndpointInfo, IApiRequest } from '@rocket.chat/apps-engine/definition/api';
import { IApiResponseJSON } from '@rocket.chat/apps-engine/definition/api/IResponse';
import {
    PUSH_BASE_URL,
    PUSH_CLOSED_FLOW,
    PUSH_MEDIA_FLOW,
    PUSH_TOKEN,
    REQUEST_TIMEOUT,
    } from '../settings/Constants';
import { getNowDate } from '../utils/DateUtils';
import { httpErrorResponse } from '../utils/HttpUtils';
import { RapidproUtils } from '../utils/RapidproUtils';
import { RocketUtils } from '../utils/RocketUtils';
import { pushEndpointValidateQuery } from '../utils/validateUtils';

export class CreateRoomEndpoint extends ApiEndpoint {
    public path = 'create-room/webhook';

    public async get(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ): Promise<IApiResponseJSON> {

        const errors = pushEndpointValidateQuery(request.query);

        if (errors) {
            const errorMessage = `Invalid query parameters...: ${JSON.stringify(errors)}`;
            this.app.getLogger().error(errorMessage);
            return httpErrorResponse(HttpStatusCode.BAD_REQUEST, errorMessage);
        }

        const departmentName = request.query.department;
        const token = request.query.token;
        const priority = request.params.priority;
        const visitor = this.getVisitorFromParams(request.query);

        const xauth = request.headers['x-auth-token'];
        const xuser = request.headers['x-user-id'];
        const siteUrl = await read.getEnvironmentReader().getServerSettings().getValueById('Site_Url');
        const timeoutValue = await read.getEnvironmentReader().getSettings().getValueById(REQUEST_TIMEOUT);
        const rocketUtils = new RocketUtils(read, http, xauth, xuser, siteUrl, timeoutValue);

        const baseUrl = await read.getEnvironmentReader().getSettings().getValueById(PUSH_BASE_URL);
        const authToken = await read.getEnvironmentReader().getSettings().getValueById(PUSH_TOKEN);
        const closeTicket = await read.getEnvironmentReader().getSettings().getValueById(PUSH_CLOSED_FLOW);
        const mediaTicket = await read.getEnvironmentReader().getSettings().getValueById(PUSH_MEDIA_FLOW);
        const rapidProUtils = new RapidproUtils(read, http, baseUrl, authToken, closeTicket, mediaTicket);

        const newRoom = await this.createRoom(rocketUtils, rapidProUtils, visitor, priority, departmentName, token);

        return newRoom;

    }

    public getVisitorFromParams(params: object): object {
        const visitor: {[key: string]: any} = {};
        const customFields: Array<object> = [];

        Object.keys(params).map( (key, index) => {
            if (['name', 'email', 'token', 'phone'].includes(key)) {
                visitor[key] = params[key];
            } else {
                const newField = {key, value: params[key], overwrite: true};
                customFields.push(newField);
            }
        });

        visitor.customFields = [];
        customFields.map( (e) => {
            visitor.customFields.push(e);
        });

        return {visitor};
    }

    public async createRoom(
        rocketUtils: RocketUtils,
        rapidProUtils: RapidproUtils,
        visitor: any,
        priority: string,
        departmentName: string,
        token: string,
        msgsAfter?: string,
        ): Promise<IApiResponseJSON> {

        const departmentId = await rocketUtils.departmentIdFromName(departmentName);
        if (!departmentId) {
            const errorMessage = `Could not find department with name: ${departmentName}`;
            this.app.getLogger().error(errorMessage);
            return httpErrorResponse(HttpStatusCode.BAD_REQUEST, errorMessage);
        }

        visitor.visitor.department = departmentId;

        const createdVisitor = await rocketUtils.createVisitor(visitor);
        if (!createdVisitor || createdVisitor.statusCode !== 200) {
            const errorMessage = `Could not create visitor: ${visitor}\nResponse obtained: ${createdVisitor}`;
            this.app.getLogger().error(errorMessage);
            return httpErrorResponse(HttpStatusCode.BAD_REQUEST, errorMessage);
        }

        const createdRoom = await rocketUtils.createRoom(token, priority);
        if (!createdRoom || createdRoom.statusCode !== 200) {
            const errorMessage = `Could not create room for visitor with token: ${token}\nResponse obtained: ${createdRoom}`;
            this.app.getLogger().error(errorMessage);
            return httpErrorResponse(HttpStatusCode.BAD_REQUEST, errorMessage);
        }

        const after = msgsAfter ? msgsAfter : getNowDate();
        const logMessage = await rapidProUtils.getLogMessages(token, after);

        const room = createdRoom.data.room;

        if (logMessage) {
            const roomId = room._id;
            await rocketUtils.createVisitorMessage(token, roomId, logMessage);
        }

        const roomResponse: IApiResponseJSON = {
            status: HttpStatusCode.OK,
            content: createdRoom.data,
        };

        return roomResponse;
    }

}
