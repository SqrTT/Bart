'use babel';

const request = require('request'),
    path = require('path'),
    Observable = require('rxjs/Observable').Observable;

require('rxjs/add/operator/mergeMap');
require('rxjs/add/operator/do');

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
    dirListRx (filePath = '.', root = this.config.root) {
        const uriPath = path.relative(root, filePath);

        return Observable.create(observer => {
            const req = request(Object.assign(this.getOptions(), {
                uri: '/' + uriPath,
                headers: {
                    Depth: 1
                },
                method: 'PROPFIND'
            }), (err, res, body) => {
                if (err) {
                    observer.error(err);
                } else if (res.statusCode >= 400) {
                    observer.error(new Error(res.statusMessage));
                } else {
                    observer.next(body);
                }

                observer.complete();
                req.destroy();
            });

            return () => req.abort();
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
            strictSSL: false,
            timeout: 60 * 1000
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
    makeRequestRx (options) {
        return Observable.create(observer => {
            console.log('request', options, this.getOptions());

            const req = request(
                Object.assign(this.getOptions(), options),
                (err, res, body) => {
                    console.log('response', body);
                    if (err) {
                        observer.error(err);
                    } else if (res.statusCode >= 400) {
                        observer.error(new Error(res.statusMessage));
                    } else {
                        observer.next(body);
                    }

                    observer.complete();
                }
            );
            return () => {
                req.destroy();
            };
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
    postRx (filePath, root = this.config.root) {
        const uriPath = path.relative(root, filePath),
            fs = require('fs');

        return Observable.create(observer => {
           const req = request(Object.assign(this.getOptions(), {
                uri: '/' + uriPath,
                method: 'PUT'
            }), (err, res, body) => {
                console.log('response', body);
                if (err) {
                    observer.error(err);
                } else if (res.statusCode >= 400) {
                    observer.error(new Error(res.statusMessage));
                } else {
                    observer.next(body);
                }

                observer.complete();
                req.destroy();
            });
            fs.createReadStream(filePath).pipe(req);

            return () => req.abort();
        });
    }
    unzip (filePath, root = this.config.root) {
        const uriPath = path.relative(root, filePath);

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
    unzipRx (filePath, root = this.config.root) {
        const uriPath = path.relative(root, filePath);

        return this.makeRequestRx({
            uri: '/' + uriPath,
            method: 'POST',
            form: {
                method: 'UNZIP'
            }
        });
    }
    postAndUnzip (filePath) {
        return this.post(filePath)
            .then(() => this.unzip(filePath));
    }
    postAndUnzipRx (filePath) {
        return this.post(filePath).flatMap(() => this.unzip(filePath));
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
    deleteRx(filePath, optionalRoot) {
        const uriPath = path.relative(optionalRoot || this.config.root, filePath);

        return Observable.create(observer => {
            console.log('deleteReuest', filePath);
            const req = request(Object.assign(this.getOptions(), {
                uri: '/' + uriPath,
                method: 'DELETE'
            }), (err, res, body) => {
                console.log('response', body);
                if (err) {
                    observer.error(err);
                } else if (res.statusCode >= 400 && res.statusCode !== 404) {
                    // it's ok to ignore 404 error if the file is not found
                    observer.error(new Error(res.statusMessage));
                } else {
                    observer.next(body);
                }

                observer.complete();
                req.destroy();
            });

            return () => req.abort();
        });
    }
    getFileListRx(pathToCartridgesDir, options) {
        const walk = require('walk');
        const {isCartridge = false} = options;
        const {isDirectory = false} = options;
        const {ignoreList = ['node_modules', '\\.git']} = options;
        const processingFolder = pathToCartridgesDir.split(path.sep).pop();

        return Observable.create(observer => {
            let walker = walk.walk(pathToCartridgesDir, {
                filters: ignoreList
            });

            function dispose() {
                if (walker) {
                    walker.removeAllListeners();
                    walker.pause();
                    walker = null;
                }
            }

            /**
             * When we have an empty Directory(eg, newly created cartridge), walking on "file" doesn't work.
             * So, we walk on "directories" and call function "addEmptyDirectory" to add
             * EMPTY DIRS to ZIP
             */
            if (isDirectory) {
                walker.on('directories', function (root, stats, next) {
                    stats.forEach(function (stat) {
                        const toFile = path.relative(isCartridge ?
                            pathToCartridgesDir.replace(processingFolder, '') :
                            pathToCartridgesDir, path.resolve(root, stat.name));

                        observer.next([toFile])
                    });
                    next();
                });
            } else {
                walker.on('file', (root, fileStat, next) => {
                    const file = path.resolve(root, fileStat.name);
                    const toFile = path.relative(isCartridge ?
                        pathToCartridgesDir.replace(processingFolder, '') :
                        pathToCartridgesDir, path.resolve(root, fileStat.name));

                    observer.next([file, toFile])

                    next();
                });
            }

            walker.on('end', () => {
                observer.complete();
            });

            walker.on('nodeError', (__, {error}) => {
                observer.error(error);
                dispose();
            });
            walker.on('directoryError', (__, {error}) => {
                observer.error(error);
                dispose();
            });

            return dispose;
        });
    }
    deleteLocalFileRx(fileName) {
        const rimraf = require('rimraf');

        return Observable.create(observer => {
            let isCanceled = false;

            rimraf(fileName, () => {
                if (!isCanceled) {
                    observer.next();
                    observer.complete();
                }
            });

            return () => {isCanceled = true}
        });
    }
    zipFilesRx(pathToCartridgesDir, cartridgesPackagePath, options) {
        const yazl = require('yazl');
        const fs = require('fs');

        return Observable.create(observer => {
            const zipFile = new yazl.ZipFile();
            var inputStream, outputStream;

            const subscription = this.getFileListRx(pathToCartridgesDir, options).subscribe(
                // next
                files => {
                    if (files.length === 1) {
                        zipFile.addEmptyDirectory(files[0]);
                    } else if (files.length === 2) {
                        zipFile.addFile(files[0], files[1]);
                    } else {
                        observer.error(new Error('Unexpected argument'));
                    }
                },
                // error
                err => {
                    observer.error(err);
                },
                // complite
                () => {
                    zipFile.end();
                    inputStream = fs.createWriteStream(cartridgesPackagePath);
                    outputStream = zipFile.outputStream;

                    zipFile.outputStream
                        .pipe(inputStream)
                        .once('close', () => {observer.next(); observer.complete()})
                        .once('error', err => observer.error(err));
                }
            );

            return () => {
                if (outputStream && inputStream) {
                    outputStream.unpipe(inputStream);
                    inputStream.end();
                }

                subscription.unsubscribe()
            }
        });
    }
    uploadCartridgesRx (
        pathToCartridgesDir,
        notify = () => {},
        options = {}
    ) {


        const processingFolder = pathToCartridgesDir.split(path.sep).pop();
        const cartridgesPackagePath = path.join(pathToCartridgesDir, 'cartridges.zip');


        return this.deleteLocalFileRx(cartridgesPackagePath)
            .do(() => {
                notify(`[${processingFolder}] Deleting local zip`);
            })
            .flatMap(() => {
                notify(`[${processingFolder}] Zipping`);
                return this.zipFilesRx(pathToCartridgesDir, cartridgesPackagePath, options)
            })
            .flatMap(() => {
                notify(`[${processingFolder}] Deleting remote zip`);
                return this.deleteRx(cartridgesPackagePath)
            })
            .flatMap(() => {
                notify(`[${processingFolder}] Sending zip to remote`);
                return this.postRx(cartridgesPackagePath, pathToCartridgesDir)
            })
            .flatMap(() => {
                notify(`[${processingFolder}] Deleting local zip...`);
                return this.deleteLocalFileRx(cartridgesPackagePath);
            })
            .flatMap(() => {
                notify(`[${processingFolder}] Unzipping remote zip`);
                return this.unzipRx(cartridgesPackagePath, pathToCartridgesDir)
            });
    }
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
                            }, reject)
                        }, reject);
                    });
            });
        });
    }
}


module.exports = WebDav;
