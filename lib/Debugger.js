'use babel';

import DebuggerConnection from './DebuggerConnection';
import BreakpointMgr from './BreakpointMgr';

const breakpointMgr = new BreakpointMgr();

function getRelativePath(file) {
    const currentRoot = atom.project.getPaths().find((path) => file.indexOf(path) === 0);
    return file.replace(currentRoot, '');
}

//import request from 'request';
//request.debug = true;

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
    updateBreakpoints () {


        this.connectionInstanse.createBreakpoints(breakpointMgr.getList().map(brk => ({
                file: getRelativePath(brk.file),
                line: brk.line
        }))).then(serverBreakpoints => {
            serverBreakpoints.forEach(serverBreakpoint => {
                breakpointMgr.getList().forEach(brk => {

                    if (serverBreakpoint.file === getRelativePath(brk.file) &&
                        serverBreakpoint.line === brk.line
                    ) {
                        brk.id = serverBreakpoint.id;
                    }
                });
            });
        }, err => {
            atom.notifications.addError('Setting breakpoint ' + err);
        });
    }
    toggleBreakpoint(editor, file, line) {
        if (file && (file.indexOf('cartridge/controllers') !== -1 || file.indexOf('cartridge/scripts') !== -1)) {
            const brk = breakpointMgr.findBreakpoint(file, line);

            if (brk) {
                this.connectionInstanse.removeBreakpoints(brk.id).then(() => {
                    breakpointMgr.remove(brk);
                }, err => {
                    atom.notifications.addError('Removing breakpoint ' + err);
                })
            } else {
                const newBrk = breakpointMgr.add(editor, file, line);
                this.updateBreakpoints();
            }

        } else {
            atom.notifications.addError('Unable to set breakpoint in non backend file');
        }
        this.connectionInstanse.getThreads().then(threads => {
            debugger;
        }, err => {
            debugger;
        });
    }
}
