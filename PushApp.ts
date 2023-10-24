import {
    IAppAccessors,
    IConfigurationExtend,
    IEnvironmentRead,
    ILogger,
} from '@rocket.chat/apps-engine/definition/accessors';
import { ApiSecurity, ApiVisibility } from '@rocket.chat/apps-engine/definition/api';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { SettingType } from '@rocket.chat/apps-engine/definition/settings';
import { CreateRoomEndpoint } from './endpoints/CreateRoomEndpoint';
import { ReceiveMessageEndpoint } from './endpoints/ReceiveMessageEndpoint';
import { RocketEndpoint } from './endpoints/RocketEndpoint';
import {
    PUSH_BASE_URL,
    PUSH_CLOSED_FLOW,
    PUSH_MEDIA_FLOW,
    PUSH_QUEUED_FLOW,
    PUSH_TAKEN_FLOW,
    PUSH_TOKEN,
    RC_CRM_URL,
    REQUEST_TIMEOUT,
} from './settings/Constants';

export class PushApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {

        // API

        await configuration.api.provideApi({
            visibility: ApiVisibility.PUBLIC,
            security: ApiSecurity.UNSECURE,
            endpoints: [
                new ReceiveMessageEndpoint(this),
                new CreateRoomEndpoint(this),
                new RocketEndpoint(this),
            ],
        });

        // Settings

        await configuration.settings.provideSetting({
            id: RC_CRM_URL,
            type: SettingType.STRING,
            packageValue: '',
            required: false,
            public: false,
            i18nLabel: 'config_rc_crm_url',
        });

        await configuration.settings.provideSetting({
            id: PUSH_BASE_URL,
            type: SettingType.STRING,
            packageValue: '',
            required: true,
            public: false,
            i18nLabel: 'config_push_base_url',
        });

        await configuration.settings.provideSetting({
            id: PUSH_TOKEN,
            type: SettingType.STRING,
            packageValue: '',
            required: true,
            public: false,
            i18nLabel: 'config_push_token',
        });

        await configuration.settings.provideSetting({
            id: PUSH_TAKEN_FLOW,
            type: SettingType.STRING,
            packageValue: '',
            required: false,
            public: false,
            i18nLabel: 'config_push_taken_flow',
        });

        await configuration.settings.provideSetting({
            id: PUSH_QUEUED_FLOW,
            type: SettingType.STRING,
            packageValue: '',
            required: false,
            public: false,
            i18nLabel: 'config_push_queued_flow',
        });

        await configuration.settings.provideSetting({
            id: PUSH_CLOSED_FLOW,
            type: SettingType.STRING,
            packageValue: '',
            required: true,
            public: false,
            i18nLabel: 'config_push_closed_flow',
        });

        await configuration.settings.provideSetting({
            id: PUSH_MEDIA_FLOW,
            type: SettingType.STRING,
            packageValue: '',
            required: false,
            public: false,
            i18nLabel: 'config_push_media_flow',
        });

        await configuration.settings.provideSetting({
            id:  REQUEST_TIMEOUT,
            type: SettingType.NUMBER,
            packageValue: 30,
            required: true,
            public: false,
            i18nLabel: 'config_push_timeout',
        });

    }
}
