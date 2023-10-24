import { IHttp, IHttpResponse, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { emojione } from '../libs/emojione';

interface IPayload {
    flow?: string;
    contacts?: Array<string>;
    restart_participants?: boolean;
    params?: object;
    urns?: Array<string>;
    groups?: Array<string>;
    text?: string;
    extra?: any;
}

export class RapidproUtils {
    private readonly MESSAGE_CHUNK_SIZE: number = 640;
    private readonly FLOW_START_API_PATH: string = '/api/v2/flow_starts.json';
    private readonly BROADCAST_MESSAGE_API_PATH: string = '/api/v2/broadcasts.json';
    private readonly GET_MESSAGES_API_PATH: string = '/api/v2/messages.json';

    private read: IRead;
    private http: IHttp;
    private authToken: string;
    private baseUrl: string;
    private closeTicket: string;
    private mediaTicket: string;

    public constructor(read: IRead, http: IHttp, baseUrl: string, authToken: string, closeTicket: string, mediaTicket: string) {
        this.read = read;
        this.http = http;
        this.baseUrl = baseUrl;
        this.authToken = authToken;
        this.closeTicket = closeTicket;
        this.mediaTicket = mediaTicket;
    }

    public getAuthorizationHeader() {
        const auth = this.authToken;
        return {Authorization: `Token ${auth}`};
    }

    public async getLogMessages(token: string, after: string): Promise<any> {

        const messagesResponse = await this.getContactMessages(token, after);
        const messages = messagesResponse.data.results.reverse();

        // TODO: Check if logMessage really works in all edge cases
        let logMessage = 'Log:\n';
        messages.map( (message) => {
            const time = this.getDateTime(message);
            const icon = message.direction === 'out' ? `:robot: ${time}` : `:bust_in_silhouette: ${time}`;
            const lines = this.getUserMessage(message);
            const firstLine = this.formatUserMessage(lines.shift(), message);

            let text = `> ${icon} ${firstLine}`;

            lines.map( (line) => {
                if (line.length > 0) {
                    const msg = this.formatUserMessage(line, message);
                    text = text.concat(`\n>${msg}`);
                }
            });
            logMessage = logMessage.concat(text + '\n');
        });

        return messages ? (messages.length > 0 ? logMessage : null) : null;
    }

    public async getContactMessages(token: string, after: string): Promise<IHttpResponse> {

        const baseUrl = this.baseUrl;

        const url = baseUrl + this.GET_MESSAGES_API_PATH;

        const query = {
            contact: token,
            after,
        };

        // TODO: RCAdmin checks if after is a string, but after analysis i dont think after can be anything else than a string, check if thats true

        const contactMessagesResponse = await this.http.get(url, {
            headers: this.getAuthorizationHeader(),
            params: query,
        });

        console.log(`Contact Messages Response: ${JSON.stringify(contactMessagesResponse)}`);

        return contactMessagesResponse;

    }

    public getDateTime(message: any) {
        const sentOn = new Date(message.created_on);
        // TODO: check timezone effects
        // sentOn.setHours(sentOn.getHours() - (sentOn.getTimezoneOffset() / 60))

        const month = String(sentOn.getMonth()).padStart(2, '0');
        const day = String(sentOn.getDay()).padStart(2, '0');
        const year = String(sentOn.getFullYear()).padStart(2, '0');
        const hour = String(sentOn.getHours()).padStart(2, '0');
        const minutes = String(sentOn.getMinutes()).padStart(2, '0');
        const seconds = String(sentOn.getSeconds()).padStart(2, '0');

        const date = `${month}/${day}/${year} às ${hour}:${minutes}:${seconds}`;

        return `[${date}]: `;
    }

    public getUserMessage(message: any) {
        const attachments = message.attachments;

        if (attachments && attachments.length > 0) {
            const urls: Array<string> = [];
            attachments.map( (e) => {
                urls.push(e.url);
            });
            return urls;
        }

        return message.text.split('\n');

    }

    public formatUserMessage(line: string, message: any) {
        return message.direction === 'out' ? line : '`' + line + '`';
    }

    public async broadcastMessages(messages: Array<any>, contacts: Array<string>) {
        messages.map( async (message) => {
            let msgText = message.msg;

            if (msgText.length === 0) {
                // TODO: Check how to handle attachments
                msgText = await this.getAttachmentUrl(message, contacts);
            } else {
                msgText = emojione.shortnameToUnicode(msgText);
                const msgs = this.chunkString(msgText, this.MESSAGE_CHUNK_SIZE);

                if (!msgs) {
                    return;
                }

                msgs.map( async (msg) => {
                    await this.broadcastMessage(msg, contacts);
                });

            }

        });
    }

    public chunkString(str: string, length: number) {
        return str.match(new RegExp('.{1,' + length + '}', 'g'));
    }

    public buildPayload(payloadArgs: IPayload): IPayload {
        const payload: IPayload = {};

        Object.keys(payloadArgs).map( (key, index) => {
            payload[key] = payloadArgs[key];
        });

        return payload;
    }

    public async broadcastMessage(message: string, contacts: Array<string>) {

        const url = this.baseUrl + this.BROADCAST_MESSAGE_API_PATH;

        const payload = this.buildPayload({text: message, contacts});

        await this.http.post(url, {
            headers: this.getAuthorizationHeader(),
            data: payload,
        });
    }

    public async closeSession(extra: object, contacts: Array<string>) {

        console.log('Starting close flow');

        const url = this.baseUrl + this.FLOW_START_API_PATH;

        const payload = this.buildPayload({flow: this.closeTicket, contacts, restart_participants: true, params: extra});

        await this.http.post(url, {
            headers: this.getAuthorizationHeader(),
            data: payload,
        });

    }

    public async getAttachmentUrl(message, contacts) {
        // TODO: check if attachment validation needs to => read file after request
        const attachments = message.attachments;
        if (attachments && attachments.length > 0) {

            attachments.map( async (attachment) => {

                const fileUrl = message.fileUpload.publicFilePath;
                const payload: IPayload = this.buildPayload({
                    flow: this.mediaTicket,
                    contacts,
                    restart_participants: true,
                    extra: {
                        flow: this.mediaTicket,
                        extra: {},
                    },
                });

                // TODO: CHECK IF FIELD 'token' in fileUrl can cause security problems
                if (attachment.image_url) {
                    payload.extra.extra.image_url = fileUrl;
                } else if (attachment.audio_url) {
                    payload.extra.extra.audio_url = fileUrl;
                } else if (attachment.title_link) { // TODO: CHECK IF THIS SHOULD BE 'document_url' OR 'title_link'
                    payload.extra.extra.document_url = fileUrl;
                }

                const url = this.baseUrl + this.FLOW_START_API_PATH;

                const mediaFlowResponse = await this.http.post( url, {
                    headers: this.getAuthorizationHeader(),
                    data: payload,
                });

                console.log('Media flow response', mediaFlowResponse);

            });
        }

    }

}
