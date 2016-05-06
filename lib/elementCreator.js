'use babel';
const createElement = typeof document !== 'undefine' ?
    document.createElement.bind(document) :
    () => {throw Error('Document is not defined. Are you in browser?')};

export const domElement = (type, attrs, ...children) => {
	const el = createElement(type);

	if (children && children.length) {
		children.forEach((child) => {
			if (typeof child === 'string' || typeof child === 'number') {
				el.textContent = child;
			} else if (child === null) {
				el.appendChild(createElement('null'));
			} else {
				el.appendChild(child);
			}
		});
	}

	if (attrs) {
		Object.keys(attrs).forEach((attrName) => {
			if (typeof attrs[attrName] === 'function') {
				el[attrName.toLowerCase()] = attrs[attrName];
			} else {
				el.setAttribute(attrName, attrs[attrName]);
			}
		});
	}

	return el;
};
