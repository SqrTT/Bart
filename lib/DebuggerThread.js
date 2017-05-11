'use babel';

const justResolve = (resolve) => {resolve()};

export default class DebuggerThread {
    constructor (threadInfo, debuggerConnection) {
        this.threadInfo = threadInfo;
        this.debuggerConnection = debuggerConnection;
    }
    stepInto() {
        //threads/{thread_id}/into
        return this.debuggerConnection.makeRequest({
            uri: '/threads/' + this.threadInfo.id + '/into',
            method: 'POST'
        }, justResolve);
    }
    stepOut() {
        //threads/{thread_id}/out
        return this.debuggerConnection.makeRequest({
            uri: '/threads/' + this.threadInfo.id + '/out',
            method: 'POST'
        }, justResolve);
    }
    stepOver() {
        //threads/{thread_id}/over
        return this.debuggerConnection.makeRequest({
            uri: '/threads/' + this.threadInfo.id + '/over',
            method: 'POST'
        }, justResolve);
    }
    resume () {
        //threads/{thread_id}/resume
        return this.debuggerConnection.makeRequest({
            uri: '/threads/' + this.threadInfo.id + '/resume',
            method: 'POST'
        }, justResolve);
    }
    stop () {
        //threads/{thread_id}/stop
        return this.debuggerConnection.makeRequest({
            uri: '/threads/' + this.threadInfo.id + '/stop',
            method: 'POST'
        }, justResolve);
    }
    updateState () {
        //threads/{thread_id}
        return this.debuggerConnection.makeRequest({
            uri: '/threads/' + this.threadInfo.id,
            method: 'POST',
            json: true
        }, (resolve, reject, body) => {
            this.threadInfo = body;
            resolve();
        });
    }
    getMembers(path, frameNo = 0) {
        return this.debuggerConnection.makeRequest({
            uri: '/threads/' + this.threadInfo.id + '/frames/' + frameNo +
                '/members' + (path ? '?object_path=' + encodeURIComponent(path) : ''),
            method: 'GET',
            json: true
        }, (resolve, reject, body) => {
            resolve(body.object_members);
        });
    }
    getEval(expr = 'this', frameNo = 0) {
        return this.debuggerConnection.makeRequest({
            uri: '/threads/' + this.threadInfo.id + '/frames/' + frameNo +
                '/eval?expr=' + encodeURIComponent(expr),
            method: 'GET',
            json: true
        }, (resolve, reject, body) => {
            resolve(body.result);
        });
    }

}
