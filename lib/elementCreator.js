'use babel';
const createElement = typeof document !== 'undefined' ?
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

export const htmlElement = (type, attrs, ...children) => {
    let content = '';
    let tagAttrs = [];

    if (children && children.length) {
        children.forEach((child) => {
            content += child;
        });
    }

    if (attrs) {
        Object.keys(attrs).forEach((attrName) => {
            tagAttrs.push(attrName + '="' + attrs[attrName] + '"');
        });
    }
    if (tagAttrs.length) {
        tagAttrs = ' ' + tagAttrs.join(' ');
    } else {
        tagAttrs = '';
    }

    return '<' + type + tagAttrs + ( content ? '>' + content + '</' + type + '>' : '/>');
};
