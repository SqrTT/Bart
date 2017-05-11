'use babel';

import request from 'request';
request.debug = true;

import DebuggerConnection from "../lib/DebuggerConnection";



describe('Debugger', () => {
    it('should exists', () => {
        expect(DebuggerConnection).toNotBe(undefined);
    });
    it('should be a function constructor', () => {
        expect(typeof DebuggerConnection).toBe('function');
    });

    it('should check breackpoints', () => {
        const deb = new DebuggerConnection(credentials);
        waitsForPromise(() => deb.init().then(() => {
            waitsForPromise(() => deb.createBreakpoints([{
                line:18,
                file: '/app_anh_controllers/cartridge/controllers/Home.js'
            }]).then((data) => {
                console.log('set breakpoints', data);
                waitsForPromise(() => deb.getBreakpoints().then((databs) => {
                    console.log('get breakpoints', databs);
                    waitsForPromise(() => deb.removeBreakpoints().then(() => {
                        waitsForPromise(() => deb.destroy())
                    }))
                }))
            }))
        }));
    });
    it("should check threads", () => {

        const deb = new DebuggerConnection(credentials);

        waitsForPromise(() => deb.init().then(() =>
            waitsForPromise(() => deb.getThreads    ().then(() =>
                waitsForPromise(() => deb.resetThreads().then(() =>
                    waitsForPromise(() => deb.destroy())
                ))
            ))
        ));


    });

});
