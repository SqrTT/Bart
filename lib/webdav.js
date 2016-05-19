'use babel';

const path = require('path');
const DWDAV = require('dwdav');

class WebDav extends DWDAV {
    uploadCartridges (pathToCartridgesDir, notify = () => {}, isCartridge = false) {

        const rimraf = require('rimraf'),
            walk = require('walk'),
            yazl = require('yazl'),
            fs = require('fs');

        const processingFolder = pathToCartridgesDir.split(path.sep).pop();

        const cartridgesPackagePath = path.join(pathToCartridgesDir, 'cartridges.zip');

        return new Promise((resolve, reject) => {
            notify('Deleting local zip');
            rimraf(cartridgesPackagePath, () => {
                notify(`[${processingFolder}] Adding files to zip`);
                const walker = walk.walk(pathToCartridgesDir);

                const zipFile = new yazl.ZipFile();
                var count = 0;

                walker.on('end', () => {
                    zipFile.end();
                    notify(`[${processingFolder}] Zipping...`);
                });
                walker.on('file', (root, fileStat, next) => {
                    const file = path.resolve(root, fileStat.name);
                    const toFile = path.relative(isCartridge ?
                        pathToCartridgesDir.replace(processingFolder, '') :
                        pathToCartridgesDir, path.resolve(root, fileStat.name));

                    zipFile.addFile(file, toFile);
                    count++;
                    next();
                });

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
