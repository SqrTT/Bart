'use babel';


export default class ProgressView {

    constructor() {
        this.el = document.createElement('div');

        this.el.className = 'b-bart';
        const spin = document.createElement('span');

        spin.className = 'loading loading-spinner-tiny inline-block';

        const message = document.createElement('span');

        message.textContent = 'bart';

        this.msg = message;

        this.el.appendChild(spin);
        this.el.appendChild(message);

        this.panel = atom.workspace.addBottomPanel({
            item: this.el,
            visible: false
        });
        this.timer = null;
    }
    add(msg) {
        this.setMessage(msg);
    }
    clean() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.panel.hide();
    }
    clear() {
        this.clean();
    }
    remove() {
        // ????
    }
    setMessage (msg) {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        this.el.classList.remove('text-error');
        this.msg.textContent = msg;

        this.panel.show();
        this.timer = setTimeout(() => {
            this.panel.hide();
            this.timer = null;
        }, 5000)

        if (!this.shown) {
            atom.notifications.addInfo('Please consider installation of package "busy-signal"');
            this.shown = true;
        }
    }
    setError () {
        throw Error('Depricated!');
    }
    getElement () {
        return this.el;
    }
}
