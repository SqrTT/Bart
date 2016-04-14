'use strict';

const request = require('request'),
    path = require('path');

class WebDav {
    constructor (config) {
        this.config = Object.assign({}, {
            hostname: 'dev07-web-anyahindmarch.demandware.net',
            username: 'a.obitskyi',
            password: 'PassPass5_',
            version: 'version1',
            root: '/git/sitegenesis/app_storefront_controllers/cartridge/controller/'
        }, config);
    }
    getOptions () {
        return {
            baseUrl: 'https://' + this.config.hostname + '/on/demandware.servlet/webdav/Sites/Cartridges/' +
                this.config.version,
            uri: '/',
            auth: {
                user: this.config.username,
                password: this.config.password
            },
            strictSSL: false
        };
    }
    post (filePath) {
        const currFolder = path.join(process.cwd(), this.config.root),
            uriPath = path.relative(currFolder, filePath),
            fs = require('fs');

        return new Promise((resolve, reject) => {
            debugger;
            const req = request(Object.assign(this.getOptions(), {
                uri: '/' + uriPath,
                method: 'PUT'
            }), (err, res, body) => {
                if (err) {debugger;
                    return reject(err);
                }
                if (res.statusCode >= 400) {
                    return reject(new Error(res.statusMessage));
                }
                resolve(body);
            });
            debugger;
            fs.createReadStream(filePath).pipe(req);
        });
    }
    unzip (filePath) {
        const currFolder = path.join(process.cwd(), this.config.root),
            uriPath = path.relative(currFolder, filePath);

        return new new Promise((resolve, reject) => {
            request(Object.assign(self.getOptions(), {
                uri: '/' + uriPath,
                method: 'POST',
                form: {
                    method: 'UNZIP'
                }
            }), (err, res, body) => {
                if (err) {
                    return reject(err);
                }
                if (res.statusCode >= 400) {
                    return reject(new Error(res.statusMessage));
                }
                resolve(body);
            });
        });
    }
    postAndUnzip (filePath) {
        return this.post(filePath)
            .then(() => this.unzip(filePath));
    }
    delete (filePath) {
        const currFolder = path.join(process.cwd(), this.config.root),
            uriPath = path.relative(currFolder, filePath);

        return new Promise((resolve, reject) => {
            request(Object.assign(self.getOptions(), {
                uri: '/' + uriPath,
                method: 'DELETE'
            }), function (err, res, body) {
                if (err) {
                    return reject(err);
                }
                // it's ok to ignore 404 error if the file is not found
                if (res.statusCode >= 400 && res.statusCode !== 404) {
                    return reject(new Error(res.statusMessage));
                }
                resolve(body);
            });
        });
    }
}


module.exports = WebDav;
