'use babel';

import DebuggerConnection from './DebuggerConnection';
import BreakpointMgr from './BreakpointMgr';

const breakpointMgr = new BreakpointMgr();


import request from 'request';
request.debug = true;

export default class Debugger {
    constructor (options) {
        this.options = options;
    }
    isActive() {
        return !!this.connectionInstanse;
    }
    activate(newOptions) {
        if (!this.connectionInstanse) {
            this.connectionInstanse = new DebuggerConnection(this.options);
        }
        return this.connectionInstanse.init();
    }
    deactivate() {
        if (this.connectionInstanse) {
            return this.connectionInstanse.destroy().then(() => {
                this.connectionInstanse = null;
            });
        } else {
            return Promise.resolve();
        }
    }
    toggleBreakpoint(editor, file, line) {
        if (file && (file.indexOf('cartridge/controllers') !== -1 || file.indexOf('cartridge/scripts') !== -1)) {
            const brk = breakpointMgr.findBreakpoint(file, line);
            if (brk) {
                breakpointMgr.remove(brk);
            } else {
                breakpointMgr.add(editor, file, line);
            }
        } else {
            atom.notifications.addError('Unable to set breakpoint in non backend file');
        }
    }
}
