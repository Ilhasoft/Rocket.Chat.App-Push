import { IHttp, IHttpResponse, IRead } from '@rocket.chat/apps-engine/definition/accessors';

export class RocketUtils {
    private xAuthToken;
    private xUserId;
    private siteUrl;
    private timeoutValue;
    private http: IHttp;
    private read: IRead;
    private DEPARTMENT_API_PATH = '/api/v1/livechat/department';
    private VISITOR_API_PATH = '/api/v1/livechat/visitor';
    private ROOM_API_PATH = '/api/v1/livechat/room';
    private LIVECHAT_MESSAGE_API_PATH = '/api/v1/livechat/message';
    private MESSAGE_API_PATH = '/api/v1/chat.getMessage';

    public constructor(read: IRead, http: IHttp, xAuth: string, xUser: string, siteUrl: string, timeout: number) {
        this.read = read;
        this.http = http;
        this.xAuthToken = xAuth;
        this.xUserId = xUser;
        this.siteUrl = siteUrl;
        this.timeoutValue = timeout >= 5 ? timeout : 5;
    }

    public async departmentIdFromName(departmentName: string): Promise<string | null> {

        const departmentsResponse = await this.http.get(this.siteUrl + this.DEPARTMENT_API_PATH, {
            headers: this.getAuthHeaders(),
            // timeout: this.getTimeout()
        });

        if (!departmentsResponse.content) {
            throw Error('Failed to get department Id from name');
        }

        const departments = JSON.parse(departmentsResponse.content).departments;

        const department = departments.find( (e) => e.name === departmentName );

        if (!department) {
            return null;
        }

        console.log('Department found: ', department);

        return department._id;
    }

    public async createVisitor(visitor: object): Promise<IHttpResponse | null> {

        const visitorResponse = await this.http.post(this.siteUrl + this.VISITOR_API_PATH,
            {
                headers: this.getAuthHeaders(),
                content: JSON.stringify(visitor),
                // timeout: this.getTimeout()
            },
        );

        if (!visitorResponse) {
            return null;
        }

        console.log('Visitor response: ', visitorResponse);

        return visitorResponse;

    }

    public async createRoom(visitorToken: string, priority?: string): Promise<IHttpResponse | null> {

        // TODO: Check priority field for enterprise editions
        const payload = {
            token: visitorToken,
            // priority: priority ? priority : "null"
        };

        const roomResponse = await this.http.get(this.siteUrl + this.ROOM_API_PATH,
            {
                headers: this.getAuthHeaders(),
                params: payload,
                // timeout: this.getTimeout()
            },
        );

        if (!roomResponse) {
            return null;
        }

        console.log('Room response: ', roomResponse);

        return roomResponse;

    }

    public async createVisitorMessage(token: string, roomId: string, message: string): Promise<IHttpResponse | null> {

        const payload = {
            token,
            rid: roomId,
            msg: message,
        };

        const visitorMessageResponse = await this.http.post(this.siteUrl + this.LIVECHAT_MESSAGE_API_PATH,
            {
                headers: this.getAuthHeaders(),
                data: payload,
                // timeout: this.getTimeout()
            },
        );

        if (!visitorMessageResponse) {
            return null;
        }

        console.log('Visitor Message Response: ', visitorMessageResponse);

        return visitorMessageResponse;

    }

    public async getMessage(msgId: string) {

        const payload = {
            msgId,
        };

        const messageResponse = await this.http.get(this.siteUrl + this.MESSAGE_API_PATH,
            {
                headers: this.getAuthHeaders(),
                params: payload,
            },
        );

        return messageResponse;
    }

    public getAuthHeaders() {
        return {'X-Auth-Token': this.xAuthToken, 'X-User-Id': this.xUserId};
    }

    public setXAuthToken(value: string) {
        this.xAuthToken = value;
    }

    public setXUserId(value: string) {
        this.xUserId = value;
    }

    public setSiteUrl(value: string) {
        this.siteUrl = value;
    }

    public setTimeoutValue(value: number) {
        this.timeoutValue = value;
    }

    public getTimeout() {
        return this.timeoutValue >= 5 ? this.timeoutValue : 5;
    }

}
