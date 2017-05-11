'use babel';

class Breakpoint {
    constructor (editor, file, line) {
        this.file = file,
        this.line = line,
        this.editor = editor;
        this.id = null;

        this.marker = this.editor.markBufferPosition([this.line, 0], {invalidate: 'never'});
        this.editor.decorateMarker(this.marker, {type: 'line-number', class: 'bart-breakpoint'});
    }
    destroy() {
        if (this.marker) {
            this.marker.destroy();
            this.marker = null;
            this.editor = null;
        }
    }
}

export default class BreakpointMgr {
    constructor() {
        this.breakpoints = [];
    }
    /**
     * [add description]
     * @param {TextEditor} editor [description]
     * @param {String} file   [description]
     * @param {String} line   [description]
     */
    add(editor, file, line) {
        const brk = this.findBreakpoint(file, line);
        if (!brk) {
            const newBrk = new Breakpoint(editor, file, line);
            this.breakpoints.push(newBrk);
            return newBrk;
        }
        return brk;
    }
    getList() {
        return this.breakpoints;
    }
    remove (breakpoint) {
        const pos = this.breakpoints.indexOf(breakpoint);
        if (pos > -1) {
            breakpoint.destroy()
            this.breakpoints.splice(pos, 1);
        }
    }
    findBreakpoint(file, line) {
        return this.breakpoints.find((breakpoint) => file === breakpoint.file && line === breakpoint.line);
    }
    cleanAll () {
        this.breakpoints.forEach((brk) => brk.destroy());
        this.breakpoints = [];
    }
}
