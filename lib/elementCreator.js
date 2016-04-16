'use babel';
const doc = document;

const element = (type, attrs, ...children) => {
	const el = doc.createElement(type);


	if (children && children.length) {
		children.forEach((child) => {
			if (typeof child === 'string' || typeof child === 'number') {
				el.textContent = child;
			} else if (child === null) {
				el.appendChild(doc.createElement('null'));
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
}

export default element;
