'use babel';

const request = require('request'),
    path = require('path');

class WebDav {
    constructor (config) {
        this.config = Object.assign({}, {
            hostname: 'some.demandware.net',
            username: 'username',
            password: 'password',
            version: 'version1',
            root: '.'
        }, config);
    }
    dirList (filePath = '.', root = this.config.root) {
        const uriPath = path.relative(root, filePath);

        return new Promise((resolve, reject) => {
            const req = request(Object.assign(this.getOptions(), {
                uri: '/' + uriPath,
                headers: {
                    Depth: 1
                },
                method: 'PROPFIND'
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
    post (filePath, root = this.config.root) {
        const uriPath = path.relative(root, filePath),
            fs = require('fs');

        return new Promise((resolve, reject) => {
            const req = request(Object.assign(this.getOptions(), {
                uri: '/' + uriPath,
                method: 'PUT'
            }), (err, res, body) => {
                if (err) {
                    return reject(err);
                }
                if (res.statusCode >= 400) {
                    return reject(new Error(res.statusMessage));
                }
                resolve(body);
            });
            fs.createReadStream(filePath).pipe(req);
        });
    }
    unzip (filePath, root = this.config.root) {
        const uriPath = path.relative(root, filePath);

        return new Promise((resolve, reject) => {
            request(Object.assign(this.getOptions(), {
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
    delete (filePath, optionalRoot) {
        const uriPath = path.relative(optionalRoot || this.config.root, filePath);

        return new Promise((resolve, reject) => {
            request(Object.assign(this.getOptions(), {
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
    uploadCartridges (pathToCartridgesDir, notify = () => {}) {

        const rimraf = require('rimraf'),
            walk = require('walk'),
            yazl = require('yazl'),
            fs = require('fs');

        const cartridgesPackagePath = path.join(pathToCartridgesDir, 'cartridges.zip');

        return new Promise((resolve, reject) => {
            notify('Deleting local zip');
            rimraf(cartridgesPackagePath, () => {
                notify('Adding files to zip');
                const walker = walk.walk(pathToCartridgesDir);

                const zipFile = new yazl.ZipFile();
                var count = 0;

                walker.on('end', () => {
                    zipFile.end();
                    notify('Zipping...');
                });
                walker.on('file', (root, fileStat, next) => {
                    zipFile.addFile(
                        path.resolve(root, fileStat.name),
                        path.relative(pathToCartridgesDir, path.resolve(root, fileStat.name))
                    );
                    count++;
                    next();
                });

                walker.on('errors', (root, nodeStatsArray, next) => {
                    reject(new Error('Read file error' + root));
                    next();
                });

                zipFile.outputStream
                    .pipe(fs.createWriteStream(cartridgesPackagePath)).on('close', () => {
                        notify('Deleting remote zip');
                        this.delete(cartridgesPackagePath).then(() => {
                            notify('Sending new zip to remote');
                            this.post(cartridgesPackagePath, pathToCartridgesDir).then(() => {
                                notify('Unzipping remote zip');
                                this.unzip(cartridgesPackagePath, pathToCartridgesDir).then(resolve, reject);
                            },
                            reject)
                        });
                    });
            });
        });
    }
}


module.exports = WebDav;
