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
    }
    add(msg) {
        this.setMessage(msg);
    }
    clean() {
        this.setMessage('');
    }
    remove() {
        // ????
    }
    setMessage (msg) {
        this.el.classList.remove('text-error');
        this.msg.textContent = msg;
    }
    setError () {
        throw Error('Depricated!');
    }
    getElement () {
        return this.el;
    }
}
