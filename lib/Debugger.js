'use babel';

import request from 'request';

request.debug = true;

const tryFn = (fn, erFn) => {
    try {
        const res = fn();
    } catch (e) {
        if (erFn) {
            erFn(e);
        }
    }
}

export default class Debugger {
    constructor (params = {}) {
        this.options = Object.assign({}, {
            hostname: 'some.demandware.net',
            password: 'password',
            username: 'username',
            clientId: 'Bart' + (Math.random() + 1000).toFixed()
        }, params);
        this.inited = false;
    }
    getOptions () {
        return {
            baseUrl: 'https://' + this.options.hostname + '/s/-/dw/debugger/v1_0/',
            uri: '/',
            auth: {
                user: this.options.username,
                password: this.options.password
            },
            headers: {
                'x-dw-client-id': this.options.clientId,
                'Content-Type' : 'application/json'
            },
            strictSSL: false
        };
    }
    init () {
        return new Promise((resolve, reject) => {
            request(Object.assign(this.getOptions(), {
                uri: '/client',
                method: 'POST'
            }), (err, res, body) => {
                if (err) {
                    return reject(err);
                }
                if (res.statusCode >= 400) {
                    return reject(new Error(res.statusMessage));
                }
                tryFn(() => {
                        resolve(body && JSON.parse(body));
                    },
                    (err) => {
                        reject(err);
                    }
                )
                resolve(body);
            });
        });
    }
    destroy () {
        return new Promise((resolve, reject) => {
            request(Object.assign(this.getOptions(), {
                uri: '/client',
                method: 'DELETE'
            }), (err, res, body) => {
                if (err) {
                    return reject(err);
                }
                if (res.statusCode >= 400) {
                    return reject(new Error(res.statusMessage));
                }
                tryFn(() => {
                        resolve(body && JSON.parse(body));
                    },
                    (err) => {
                        reject(err);
                    }
                )
                resolve(body);
            });
        });
    }
}
