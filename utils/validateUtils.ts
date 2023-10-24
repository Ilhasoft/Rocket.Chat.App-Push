import {validate} from '../libs/validate';

export function pushEndpointValidateQuery(query: object): any {

    const constraints = {
        department: {
            presence: {
                allowEmpty: false,
            },
            type: 'string',
        },
        token: {
            presence: {
                allowEmpty: false,
            },
            type: 'string',
        },
        priority: {
            presence: false,
            type: 'number',
        },
        name: {
            presence: {
                allowEmpty: false,
            },
            type: 'string',
        },
        email: {
            presence: false,
            email: true,
            type: 'string',
        },
        phone: {
            presence: false,
            type: 'string',
        },
    };

    const errors = validate(query, constraints);

    return errors;

}
