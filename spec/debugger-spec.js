'use babel';

import Debugger from "../lib/Debugger";

describe('Debugger', () => {
    it('should exists', () => {
        expect(Debugger).toNotBe(undefined);
    });
    it('should be a function constructor', () => {
        expect(typeof Debugger).toBe('function');
    });
    it("should not fail", function (done) {
        const deb = new Debugger({
            username: 'testuser',
            password: 'testPass',
            hostname: 'some.demandware.net'
        });
        const pErr = (err) => {
            console.error(err);
            done = true;
        }

        runs(() => {
            deb.init().then((json) => {
                console.log(json);
                deb.destroy().then((value) => {
                    done = true;
                }, pErr);
            }, pErr);
        });
        waitsFor(() => done, 'is timeouted', 5000);

    });

});
