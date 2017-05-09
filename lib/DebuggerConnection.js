'use babel';

import request from 'request';
import DebuggerThread from './DebuggerThread'



export default class DebuggerConnection {
    constructor (params = {}) {
        this.options = Object.assign({}, {
            hostname: 'some.demandware.net',
            password: 'password',
            username: 'username',
            clientId: 'Bart_' + (Math.random() * 100000).toFixed()
        }, params);
        this.estabilished = false;
        this.timer = null;
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
    makeRequest (options, cb) {
        return new Promise((resolve, reject) => {
            if (!this.estabilished) {
                reject(Error('Connection is not estabilished'));
                return;
            }
            console.log('request', options, this.getOptions());
            request(Object.assign(this.getOptions(), options), (err, res, body) => {
                console.log('response', body);
                if (err) {
                    return reject(err);
                }
                if (res.statusCode >= 400) {
                    return reject(new Error(res.statusMessage));
                }
                cb(resolve, reject, body);
            });
        });
    }
    init () {
        console.info('initing', this.getOptions());

        return new Promise((resolve, reject) => {
            request(Object.assign(this.getOptions(), {
                uri: '/client',
                method: 'POST'
            }), (err, res) => {
                if (err) {
                    return reject(err);
                }
                if (res.statusCode >= 400) {
                    return reject(new Error(res.statusMessage));
                }
                this.estabilished = true;
                this.timer = setTimeout(this.resetThreads.bind(this), 30000);
                resolve();
            });
        });
    }
    destroy () {
        console.info('destroy', this.getOptions());
        clearInterval(this.timer);
        return new Promise((resolve, reject) => {
            request(Object.assign(this.getOptions(), {
                uri: '/client',
                method: 'DELETE'
            }), (err, res) => {
                if (err) {
                    return reject(err);
                }
                if (res.statusCode >= 400) {
                    return reject(new Error(res.statusMessage));
                }
                this.estabilished = false;
                resolve();
            });
        });
    }

    /**
     * @params breakpoints[]
     *
     **/
    createBreakpoints(breakpoints) {
        return this.makeRequest({
            uri: '/breakpoints',
            method: 'POST',
            json: {
                breakpoints: breakpoints.map(breakpoint => ({
                    line_number: breakpoint.line,
                    script_path: breakpoint.file
                }))
            }
        }, (resolve, reject, body) => {
            resolve(body.breakpoints.map(breakpoint => ({
                id: breakpoint.id,
                file: breakpoint.script_path,
                line: breakpoint.line_number
            })));
        });
    }
    getBreakpoints(id) {
        return this.makeRequest({
            uri: '/breakpoints' + ( id ? '/' + id : ''),
            method: 'get',
            json: true
        }, (resolve, reject, body) => {
            if (body.breakpoints) {

                resolve(body.breakpoints.map(breakpoint => ({
                    id: breakpoint.id,
                    file: breakpoint.script_path,
                    line: breakpoint.line_number
                })));
            } else {
                resolve([]);
            }
        });
    }
    removeBreakpoints(id) {
        return this.makeRequest({
            uri: '/breakpoints' + ( id ? '/' + id : ''),
            method: 'DELETE'
        }, (resolve) => {
            resolve();
        });
    }
    resetThreads () {
        clearTimeout(this.timer);
        return this.makeRequest({
            uri: '/threads/reset',
            method: 'POST'
        }, (resolve) => {
            resolve();
        }).then(() => {
            this.timer = setTimeout(this.resetThreads.bind(this), 45000);
        }, (err) => {
            atom.notifications.addError('Unable keepalive. Try reopen debugger. ' + err);
            return Promise.reject(err);
        })
    }
    getThreads () {
        return this.makeRequest({
            uri: '/threads',
            method: 'GET',
            json: true
        }, (resolve, reject, body) => {
            if (body.script_threads) {
                resolve(body.script_threads.map(thread => new DebuggerThread(thread, this)));
            } else {
                resolve([]);
            }
        })
    }

}
