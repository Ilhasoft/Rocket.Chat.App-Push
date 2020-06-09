import { HttpStatusCode, IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiEndpoint, IApiEndpointInfo, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';
import { IApiResponseJSON } from '@rocket.chat/apps-engine/definition/api/IResponse';
import { getNowDate } from '../utils/DateUtils';
import { RocketCaller } from '../utils/RocketCaller';
import { pushEndpointValidateQuery } from '../utils/validateUtils';

export class PushEndpoint extends ApiEndpoint {
    public path = 'push/webhook';

    public async get(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ): Promise<IApiResponse> {

        this.app.getLogger().debug(request);

        const errors = pushEndpointValidateQuery(request.query);

        if (errors) {
            const errorResponse: IApiResponseJSON = {
                status: HttpStatusCode.BAD_REQUEST,
                content: {'Invalid query parameters...': JSON.stringify(errors)},
            };
            this.app.getLogger().error(`Invalid query parameters...: ${JSON.stringify(errors)}`);
            return errorResponse;
        }

        const departmentName = request.query.department;
        const token = request.query.token;
        const priority = request.params.priority;
        const visitor = this.getVisitorFromParams(request.query);

        RocketCaller.xAuthToken = request.headers['x-auth-token'];
        RocketCaller.xUserId = request.headers['x-user-id'];

        const newRoom = await this.createRoom(read, http, visitor, priority, departmentName, token);

        return newRoom;
    }

    public getVisitorFromParams(params: object): object {
        const visitor: {[key: string]: any} = {};
        const customFields: Array<object> = [];

        Object.keys(params).map( (key, index) => {
            if (['name', 'email', 'token', 'phone'].includes(key) ) {
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

    public async createRoom(read: IRead, http: IHttp, visitor, priority, departmentName, token, msgsAfter?): Promise<IApiResponse> {

        // TODO: use Cache to store and get rooms
        if (departmentName) {
            const departmentId = await RocketCaller.rocketDepartmentIdFromName(read, http, departmentName);
            visitor.visitor.department = departmentId;
        }

        const createdVisitor = RocketCaller.rocketCreateVisitor(read, http, visitor);
        const createdRoom = RocketCaller.rocketCreateRoom(read, http, token, priority);
        const after = msgsAfter ? msgsAfter : getNowDate();
        console.log('Now date: ', after);

        return this.success();
    }

}
