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
            request(Object.assign(this.getOptions(), {
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
    makeRequest (options, cb) {
        return new Promise((resolve, reject) => {
            console.log('request', options, this.getOptions());
            request(Object.assign(this.getOptions(), options), (err, res, body) => {
                console.log('response', body);
                if (err) {
                    return reject(err);
                }
                if (res.statusCode >= 400) {
                    return reject(new Error(res.statusMessage));
                }
                cb(resolve, reject, body);
            });
        });
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

        // HACK: this thing speedup response from server
        setTimeout(() => {
            this.dirList();
        }, 1000);

        return this.makeRequest({
                uri: '/' + uriPath,
                method: 'POST',
                form: {
                    method: 'UNZIP'
                }
            }, (resolve, reject, body) => {
                resolve(body);
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
    // TODO: make `options` configurable throught UI|config
    uploadCartridges (
        pathToCartridgesDir,
        notify = () => {},
        isCartridge = false,
        isDirectory = false,
        options = {}
    ) {

        const rimraf = require('rimraf'),
            walk = require('walk'),
            yazl = require('yazl'),
            fs = require('fs'),
            {ignoreList = ['node_modules', '\\.git']} = options;

        const processingFolder = pathToCartridgesDir.split(path.sep).pop();

        const cartridgesPackagePath = path.join(pathToCartridgesDir, 'cartridges.zip');

        return new Promise((resolve, reject) => {
            notify('Deleting local zip');
            rimraf(cartridgesPackagePath, () => {
                notify(`[${processingFolder}] Adding files to zip`);
                const walker = walk.walk(pathToCartridgesDir, {
                    filters: ignoreList
                });

                const zipFile = new yazl.ZipFile();

                walker.on('end', () => {
                    zipFile.end();
                    notify(`[${processingFolder}] Zipping...`);
                });
                /**
                 * When we have an empty Directory(eg, newly created cartridge), walking on "file" doesn't work.
                 * So, we walk on "directories" and call function "addEmptyDirectory" to add
                 * EMPTY DIRS to ZIP
                 */
                if (isDirectory) {
                    walker.on('directories', function (root, stats, next) {
                        stats.forEach(function (stat) {
                            const file = path.resolve(root, stat.name);
                            const toFile = path.relative(isCartridge ?
                                pathToCartridgesDir.replace(processingFolder, '') :
                                pathToCartridgesDir, path.resolve(root, stat.name));
                            zipFile.addEmptyDirectory(toFile);
                        });
                        next();
                    });
                } else {
                    walker.on('file', (root, fileStat, next) => {
                        console.log("walking file");
                        const file = path.resolve(root, fileStat.name);
                        const toFile = path.relative(isCartridge ?
                            pathToCartridgesDir.replace(processingFolder, '') :
                            pathToCartridgesDir, path.resolve(root, fileStat.name));

                        zipFile.addFile(file, toFile);
                        next();
                    });
                }

                walker.on('errors', (root, nodeStatsArray, next) => {
                    reject(new Error('Read file error' + root));
                    next();
                });

                zipFile.outputStream
                    .pipe(fs.createWriteStream(cartridgesPackagePath)).on('close', () => {
                        notify(`[${processingFolder}] Deleting remote zip`);
                        this.delete(cartridgesPackagePath).then(() => {
                            notify(`[${processingFolder}] Sending new zip to remote`);
                            this.post(cartridgesPackagePath, pathToCartridgesDir).then(() => {
                                notify(`[${processingFolder}] Unzipping remote zip`);
                                this.unzip(cartridgesPackagePath, pathToCartridgesDir).then(() => {
                                    rimraf(cartridgesPackagePath, resolve);
                                }, reject);
                            },
                            reject)
                        });
                    });
            });
        });
    }
}


module.exports = WebDav;
