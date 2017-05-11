'use babel';

import DebuggerConnection from './DebuggerConnection';
import BreakpointMgr from './BreakpointMgr';
import DebuggerView from './DebuggerView';
import path from 'path';


if (!Promise.prototype.always) {
    Promise.prototype.always = function(onResolveOrReject) {
        return this.then(onResolveOrReject,
            function(reason) {
                onResolveOrReject(reason);
                throw reason;
            });
        };
}

const breakpointMgr = new BreakpointMgr();

function getRelativePath(fileName) {
    const options = require('./bart').getOptions();

    let currentRoot = atom.project.getPaths().find((path) => fileName.indexOf(path) === 0);

    if (!currentRoot) {
        return '';
    }

    if (options.cartridges && options.cartridges.trim().length) {
        let cartPath = options.cartridges
            .split('\n')
            .map(str => str.trim())
            .find((path) => fileName.indexOf(path) !== -1);

        if (cartPath) {
            cartPath = cartPath.split(path.sep);
            cartPath.pop();

            currentRoot = path.join(currentRoot, cartPath.join(path.sep));
        } else {
            return '';
        }
    }
    return fileName.replace(currentRoot, '').split(path.sep).join('/');
}

function mapDwPathToProject(dwPath) {
    const options = require('./bart').getOptions();
    const workspacePath = atom.project.getPaths()[0];
    let newPath = dwPath.split('/').join(path.sep);

    if (options.cartridges && options.cartridges.trim().length) {
        let cartPath = options.cartridges
            .split('\n')
            .map(str => str.trim())
            .find((cartridge) => dwPath.indexOf(cartridge.split(path.sep).pop()) !== -1);

        if (cartPath) {
            cartPath = cartPath.split(path.sep);
            cartPath.pop();

            newPath = path.join(cartPath.join(path.sep), newPath);
        }
    }
    return path.join(workspacePath, newPath);
}

//import request from 'request';
//request.debug = true;

export default class Debugger {
    constructor (options) {
        this.options = options;
        this.debuggerView = new DebuggerView();
        this.debuggerPanel = atom.workspace.addBottomPanel({
            item: this.debuggerView.getElement(),
            visible: false
        });
        this.debuggerView.on('close', this.deactivate.bind(this));
        this.debuggerView.on('stepover', this.stepover.bind(this));
        this.debuggerView.on('stop', this.stop.bind(this));
        this.debuggerView.on('resume', this.resume.bind(this));
        this.debuggerView.on('stepin', this.stepin.bind(this));
        this.debuggerView.on('stepout', this.stepout.bind(this));
        this.debuggerView.on('selectFrame', (frameNo) => {
            this.setActiveBreakpoint(this.currentThread, frameNo);
        });
        this.currentThread = null;
        this.activeBreakpointMarker = null;
    }
    setActiveBreakpoint(maybeThread, frameNo = 0) {
        if (this.activeBreakpointMarker) {
            this.activeBreakpointMarker.destroy();
        }

        if (maybeThread && maybeThread.threadInfo.call_stack) {

            this.debuggerView.updateValues('spin');
            maybeThread.getMembers(null, frameNo).then((values) => {
                this.debuggerView.updateValues(values);
            });
            // hack...
            setTimeout(() => {
                this.connectionInstanse.resetThreads();
            }, 50);

            const dwPath = mapDwPathToProject(maybeThread.threadInfo.call_stack[frameNo].location.script_path);
            atom.workspace.open(dwPath, {
                initialLine: maybeThread.threadInfo.call_stack[frameNo].location.line_number - 1
            }).then(editor => {
                this.activeBreakpointMarker = editor.markBufferPosition(
                    [maybeThread.threadInfo.call_stack[frameNo].location.line_number - 1, 0], {invalidate: 'never'});

                editor.decorateMarker(this.activeBreakpointMarker, {type: 'line', class: 'bart-breakpoint_active'});
            });

        }
    }
    stepover() {
        if (this.currentThread) {
            this.currentThread.stepOver().always(() => {
                this.update();
            });
            this.debuggerView.updateThread('spin');
        }
    }
    stepin() {
        if (this.currentThread) {
            this.currentThread.stepInto().always(() => {
                this.update();
            });
            this.debuggerView.updateThread('spin');
        }
    }
    stepout() {
        if (this.currentThread) {
            this.currentThread.stepOut().always(() => {
                this.update();
            });
            this.debuggerView.updateThread('spin');
        }
    }
    stop() {
        if (this.currentThread) {
            this.currentThread.stop().always(() => {
                this.update();
            });
            this.debuggerView.updateThread('spin');
        }
    }
    resume() {
        if (this.currentThread) {
            this.currentThread.resume().always(() => {
                this.update();
            });
            this.debuggerView.updateThread('spin');
        }
    }
    update() {
        if (this.isActive()) {
            this.connectionInstanse.getThreads().then((threads) => {
                if (threads.length) {
                    threads.forEach((thread) => {
                        // work only with one active thread, others just resume
                        if (!this.currentThread || (this.currentThread && this.currentThread.threadInfo.id === thread.threadInfo.id)) {
                            this.currentThread = thread;
                        } else if (this.currentThread && this.currentThread.threadInfo.id !== thread.threadInfo.id) {
                            thread.resume();
                        }
                    });
                } else {
                    this.currentThread = null;
                }
                if (
                    !this.currentThread ||
                    !window.currentThread ||
                    window.currentThread.threadInfo.id !== this.currentThread.threadInfo.id ||
                    window.currentThread.threadInfo.call_stack[0].location.line_number !== this.currentThread.threadInfo.call_stack[0].location.line_number
                ) {
                    this.debuggerView.updateThread(this.currentThread);
                    this.setActiveBreakpoint(this.currentThread);
                    window.currentThread = this.currentThread;
                }

            }).catch(err => {
                this.currentThread = null;
                window.currentThread;
                this.debuggerView.updateThread(null);
                this.setActiveBreakpoint(null);
                atom.notifications.addError('Keep alive: ' + err);
            });

        }
    }
    isActive() {
        return !!this.connectionInstanse;
    }
    toggle() {
        if (this.isActive()) {
            return this.deactivate();
        } else {
            return this.activate();
        }
    }
    activate() {
        if (!this.connectionInstanse) {
            this.connectionInstanse = new DebuggerConnection(this.options);
        }
        return this.connectionInstanse.init().then(() => {
            this.debuggerPanel.show();
            this.timer = setInterval(this.update.bind(this), 10000);
        }).then(() => {
            atom.notifications.addInfo('Activated Debugger');
        }, (err) => {
            atom.notifications.addError('Activating Debugger: ' + err);
        });
    }
    deactivate() {
        if (this.activeBreakpointMarker) {
            this.activeBreakpointMarker.destroy();
        }
        breakpointMgr.cleanAll();
        if (this.connectionInstanse) {
            return this.connectionInstanse.destroy().then(() => {
                this.connectionInstanse = null;
                this.debuggerPanel.hide();
                clearInterval(this.timer);
            }).then(() => {
                atom.notifications.addInfo('Dectivated Debugger');
            }, (err) => {
                atom.notifications.addError('Deactivating Debugger: ' + err);
            });
        } else {
            return Promise.resolve();
        }
    }
    updateBreakpoints () {
        this.connectionInstanse.createBreakpoints(breakpointMgr.getList().map(brk => ({
                file: getRelativePath(brk.file),
                line: brk.line + 1
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
        if (file && (file.indexOf(path.join('cartridge', 'controllers'))) !== -1 ||
          file.indexOf(path.join('cartridge', 'scripts') !== -1)) {
            const brk = breakpointMgr.findBreakpoint(file, line);

            if (brk) {
                breakpointMgr.remove(brk);
                this.connectionInstanse.removeBreakpoints(brk.id).then(null, err => {
                    atom.notifications.addError('Removing breakpoint ' + err);
                })
            } else {
                breakpointMgr.add(editor, file, line);
                this.updateBreakpoints();
            }

        } else {
            atom.notifications.addError('Unable to set breakpoint in non backend file');
        }
    }
}
