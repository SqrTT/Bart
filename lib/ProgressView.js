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
	setMessage (msg) {
		this.el.classList.remove('text-error');
		this.msg.textContent = msg;
	}
	setError (msg) {
		this.el.classList.add('text-error');
		this.msg.textContent = msg;
	}
	getElement () {
		return this.el;
	}
}
