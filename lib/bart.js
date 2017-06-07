'use babel'

import ProgressView from './ProgressView';
import OptionsView from './OptionsView';
import NewCartridgeView from './NewCartridgeView';
import Debugger from './Debugger';
const Observable = require('rxjs/Observable').Observable;
require('rxjs/add/observable/concat');
require('rxjs/add/observable/empty');
require('rxjs/add/observable/merge');
require('rxjs/add/operator/mergeMap');
require('rxjs/add/operator/do');



const atomP = require('atom'),
    path = require('path'),
    subscriptions = new atomP.CompositeDisposable(),
    fs = require('fs'),
    util = require('util'),
    chokidar = require('chokidar');

var debuggerInstance,
    uploadCartridgesSubscription,
    watcherSubscription,
    Bart;

const path2DwPath = (fileName) => {
    const options = Bart.getOptions();

    const currentRoot = atom.project.getPaths().find((path) => fileName.indexOf(path) === 0);

    if (!currentRoot) {
        return
    }

    if (options.cartridges && options.cartridges.trim().length) {
        let cartPath = options.cartridges
            .split('\n')
            .map(str => str.trim())
            .find((path) => fileName.indexOf(path) !== -1);

        if (cartPath) {
            cartPath = cartPath.split(path.sep);
            cartPath.pop();

            return path.join(currentRoot, cartPath.join(path.sep));
        } else {
            atom.notifications.addWarning('File is not in list cartridges');
            return;
        }
    }
    return currentRoot;
}

function log(...msgs) {
    if (Bart.getOptions().debugMode) {
        console.log(...msgs);
    }
}

Bart = {
    initWatcher : () => {
        if (watcherSubscription) {
            watcherSubscription.unsubscribe();
        }
        const options = Bart.getOptions();
        if (!options.password) {
            Bart.openConfig();
            return;
        }

        const WebDav = require('./webdav');
        const webdav = new WebDav(options, log);

        watcherSubscription = Observable.create(observer => {
            const watcher = chokidar.watch(null, {
                ignored: [
                    '**/node_modules/**',
                    '**/.git/**',
                    `**/cartridge/js/**`,
                    `**/cartridge/client/**`
                ],
                persistent: true,
                ignoreInitial: true,
                followSymlinks: false
            });

            const fileExtentions = `${path.sep}**${path.sep}*.*`;

            atom.project.getDirectories().forEach(dir => {
                if (options.cartridges && options.cartridges.trim().length) {
                    options.cartridges
                        .split('\n')
                        .map(str => str.trim())
                        .filter(Boolean)
                        .forEach(cartridge => {
                            const files = path.join(dir.getPath(), cartridge) + fileExtentions;
                            watcher.add(files);
                        })
                } else {
                    const files = dir.getPath() + fileExtentions;
                    watcher.add(files);
                }
            });

            watcher.on('change', path => observer.next(['upload', path]));
            watcher.on('add', path => observer.next(['upload', path]));
            watcher.on('unlink', path => observer.next(['delete', path]));
            watcher.on('error', err => observer.error(err));

            atom.notifications.addInfo('Watching files...');

            return () => {
                watcher.close();
                atom.notifications.addWarning('Watching disabled.');
            }
        }).mergeMap(([action, fileName]) => {
            const currentRoot = path2DwPath(fileName);

            if (!currentRoot) {
                atom.notifications.addWarning('File is not in list cartridges to by uploaded');
                return;
            }

            if (action === 'upload') {
                const msg = `Uploading file: "${fileName}"`
                Bart.progressMsg.add(msg);

                return webdav
                    .post(fileName, currentRoot)
                    .do(() => {
                        Bart.progressMsg.remove(msg);
                    });
            } else if (action === 'delete') {
                const msg = `Deleting file: "${fileName}"`
                Bart.progressMsg.add(msg);

                return webdav
                    .delete(fileName, currentRoot)
                    .do(() => {
                        Bart.progressMsg.remove(msg);
                    });
            } else {
                throw Error('Unknown action');
            }
        }, 10)// no more that 10 file at time
        .subscribe(
            () => {},
            err => {
                log(err);
                atom.notifications.addError(err.toString() + '\nWatcher disabled.\nUpload all...');
                Bart.uploadAll();
                Bart.progressMsg.clear();
            }
        );

    },
    initRepo : () => {
        // var currentBranch;
        // const getRepo = () => {
        //     return repo || (() => {
        //         repo = atom.project.getRepositories()[0]
        //         if (repo) {
        //             currentBranch = repo.getShortHead();
        //             repo.onDidDestroy(() => {
        //                 repo = null;
        //             });
        //         }
        //         return repo;
        //     })();
        // }
        // if (!getRepo()) {
        //     return;
        // }


        // timer = setInterval(() => {
        //     if (atom.config.get('Bart.autoBuildEnabled')) {
        //         const localRepo = getRepo();
        //         if (localRepo && currentBranch !== localRepo.getShortHead()) {
        //             currentBranch = localRepo.getShortHead();
        //             //Bart.uploadAll();
        //         }
        //     }
        // }, 5000);

    },
    setOptions : (options) => {
        if (options.saveconfigtofile) {
            Bart.setConfigToFile(options);
            return;
        }

        Object.keys(options).forEach((key) => {
            if (key === 'password') {
                sessionStorage['bart-' + key] = options[key];
            } else {
                localStorage['bart-' + key] = options[key];
            }
        });
    },
    getOptions : () => {
        var configObj = Bart.getConfigFromFile();

        if (!configObj) {
            configObj = [
                'password',
                'hostname',
                'username',
                'cartridges',
                'version',
                'watchlist',
                'uploadaftersave',
                'saveconfigtofile'
            ].reduce((acc, key) => {
                if (key === 'password') {
                    acc[key] = sessionStorage['bart-' + key];
                } else {
                    acc[key] = localStorage['bart-' + key];
                }
                return acc;
            }, {})
        }

        return configObj;
    },
    getConfigFilePath : () => {
        const fileName = 'dw.json',
            getPaths = atom.project.getPaths();
        var configFilePath = '';

        configFilePath = (getPaths[0] ? getPaths[0] : './');
        return configFilePath + (configFilePath.includes('/') ? '/' : '\\') + fileName;
    },
    getConfigFromFile : () => {
        const configFilePath = Bart.getConfigFilePath();
        var confObject;

        if (fs.existsSync(configFilePath)) {
            try {
                confObject = JSON.parse(String(fs.readFileSync(configFilePath)));
            } catch (err) {
                atom.notifications.addWarning('Parse dw.json error: ' + err);
            }
        }

        if (confObject) {
            Object.keys(confObject).forEach(key => {
                if (confObject[key] === true) {
                    confObject[key] = 'true';
                }
            });
        }

        return confObject;
    },
    setConfigToFile : (options) => {
        const configFilePath = Bart.getConfigFilePath();
        var configJson = JSON.stringify(options, null, '    ') || '';

        fs.writeFileSync(configFilePath, configJson);
    },
    consumeSignal(registry) {
      const provider = registry.create()
      subscriptions.add(provider);

      Bart.progressMsg = provider;
    },
    activate : () => {
        subscriptions.add(atom.commands.add('atom-workspace', {
                'bart:uploadFile': Bart.uploadFile.bind(Bart),
                'bart:uploadAll': Bart.uploadAll.bind(Bart),
                'bart:openConfig': Bart.openConfig.bind(Bart),
                'bart:toggleDebugger' : Bart.toggleDebugger.bind(Bart),
                'bart:toggleBreakpoint' : Bart.toggleBreakpoint.bind(Bart),
                'bart:openCreateNewCartridgeView' : Bart.openCreateNewCartridgeView.bind(Bart),
                'bart:toggleAutoBuild' : Bart.toggleAutoBuild.bind(Bart),
                'bart:resume' : () => debuggerInstance && debuggerInstance.resume(),
                'bart:stepover' : () => debuggerInstance && debuggerInstance.stepover(),
                'bart:stepin' : () => debuggerInstance && debuggerInstance.stepin(),
                'bart:stepout' : () => debuggerInstance && debuggerInstance.stepout()
            })
        );

        const options = Bart.getOptions();

        if (options.watchlist) {
            atom.notifications.addInfo('Bart: Config "watchlist" is deprecated. Now Bart watches all files in cartridges by default. Please clean up option.');
        }

        Bart.progressMsg = new ProgressView();

        Bart.optionsView = new OptionsView(options);
        Bart.optionsPanel = atom.workspace.addModalPanel({
            item: Bart.optionsView.getElement(),
            visible: false
        });

        Bart.optionsView.on('cancel', () => {
            Bart.optionsPanel.hide();
        });
        Bart.optionsView.on('save', (options) => {
            const WebDav = require('./webdav');

            if (!options.password) {
                const storedOptions = Bart.getConfigFromFile();
                if (storedOptions && storedOptions.password) {
                    options.password = storedOptions.password;
                }
            }

            const webdav = new WebDav(options, log);

            if (options.version) {

                const subscription = webdav.dirList().subscribe(
                    // next
                    () => {
                        Bart.setOptions(options);
                        Bart.optionsView.clean();
                        Bart.optionsPanel.hide();
                        Bart.initWatcher();
                        Bart.optionsView.setError('');
                        if (options.uploadaftersave) {
                            Bart.uploadAll();
                        }
                    },
                    // error
                    err => Bart.optionsView.setError(err),
                    // complite
                    () => subscription.unsubscribe()
                );
            } else {
                Bart.optionsView.setError('Code version must not be empty');
            }
        });

        Bart.newCartridgeView = new NewCartridgeView();
        Bart.newCartridgePanel = atom.workspace.addModalPanel({
            item : Bart.newCartridgeView.getElement(),
            visible : false
        });

        Bart.newCartridgeView.on( 'cancel', () => {
            Bart.newCartridgePanel.hide();
        });

        Bart.newCartridgeView.on( 'create', ( options ) => {
            Bart.createDWRECartridge( options );
        });

        Bart.initWatcher();
        //Bart.initRepo();
    },
    deactivate : () => {
        subscriptions.dispose();

        if (uploadCartridgesSubscription) {
            uploadCartridgesSubscription.unsubscribe();
        }

        if (watcherSubscription) {
            watcherSubscription.unsubscribe();
        }

        if (debuggerInstance && debuggerInstance.isActive()) {
            debuggerInstance.deactivate();
            debuggerInstance = undefined;
        }
    },
    serialize : () => {

    },
    saveFile : (fileName /*: string*/) => {
        const options = Bart.getOptions();
        if (!options.password) {
            Bart.openConfig();
            return;
        }
        const currentRoot = path2DwPath(fileName);

        if (!currentRoot) {
            atom.notifications.addWarning('File is not in list cartridges to by uploaded');
            return;
        }

        const WebDav = require('./webdav');
        const webdav = new WebDav(Object.assign({
            root: currentRoot
        }, options), log);

        const msg = `Uploading file: "${path.basename(fileName)}" ...`
        Bart.progressMsg.add(msg);

        const subscription = webdav.post(fileName).subscribe(
            () => Bart.progressMsg.remove(msg),
            err => {
                Bart.progressMsg.remove(msg);
                const errorMsg = `<b>Error: ${err}</b>`;
                Bart.progressMsg.add(errorMsg);
                setTimeout(() => {
                    Bart.progressMsg.remove(errorMsg);
                }, 10000);
                atom.notifications.addError(err);
            },
            () => {
                Bart.progressMsg.remove(msg);
                subscription.unsubscribe();
            }
        );
        return subscription;
    },
    uploadFile : () => {
        const activeTextEditor = atom.workspace.getActiveTextEditor();

        if (activeTextEditor && activeTextEditor.getBuffer().getPath()) {
            Bart.saveFile(activeTextEditor.getBuffer().getPath());
        }
    },
    uploadAll: () => {
        const options = Bart.getOptions();
        if (!options.password) {
            Bart.openConfig();
            return;
        }

        const WebDav = require('./webdav');
        const webdav = new WebDav(options, log);

        function getNotify() {
            let prefMsg = null;
            return msg => {
                if (prefMsg) {
                    Bart.progressMsg.remove(prefMsg);
                }
                if (msg) {
                    Bart.progressMsg.add(msg);
                }
                prefMsg = msg;
            }
        }

        if (uploadCartridgesSubscription) {
            Bart.progressMsg.clear();
            uploadCartridgesSubscription.unsubscribe();
        }
        if (watcherSubscription) {
            watcherSubscription.unsubscribe();
        }

        uploadCartridgesSubscription = Observable.concat(...atom.project.getDirectories().map(dir => {

            if (options.cartridges && options.cartridges.trim().length) {

                const toUpload = options.cartridges
                    .split('\n')
                    .map(str => str.trim())
                    .filter(Boolean)
                    .map(cartridge => {
                        const notify = getNotify();
                        const dirToUpload = path.join(dir.getPath(), cartridge);
                        return webdav
                            .uploadCartridges(dirToUpload, notify, {isCartridge: true})
                            .do(() => notify());
                    });
                return Observable.merge(...toUpload, 2);
            } else {
                const toUpload = dir.getEntriesSync()
                    .filter(FileOrDirectory =>
                        FileOrDirectory.isDirectory() &&
                        !FileOrDirectory.getPath().includes('.git') &&
                        !FileOrDirectory.getPath().includes('node_modules')
                    )
                    .map(directory => {
                        const notify = getNotify();
                        return webdav
                            .uploadCartridges(directory.getPath(), notify, {isCartridge: true})
                            .do(() => notify());
                    });

                return Observable.merge(...toUpload, 2);
                //return webdav.uploadCartridges(dir.getPath(), notify);
            }
        })).subscribe(
            // next
            () => {},
            // error
            err => {
                Bart.progressMsg.clear();
                const errorMsg = `Error: ${err}`;
                Bart.progressMsg.add(errorMsg);
                setTimeout(() => {
                    Bart.progressMsg.remove(errorMsg);
                }, 1000);
                atom.notifications.addError(err.toString());
                uploadCartridgesSubscription = null;
                Bart.initWatcher();
            },
            // complete
            () => {
                Bart.progressMsg.clear();
                uploadCartridgesSubscription = null;
                Bart.initWatcher();
                atom.notifications.addInfo('Cartridges has been uploaded.');
            }
        );
    },
    openConfig() {
        if (Bart.optionsPanel.isVisible()) {
            Bart.optionsPanel.hide();
        } else {
            Bart.optionsPanel.show();
        }
    },
    toggleDebugger() {
        const options = Bart.getOptions();
        if (!options.password) {
            Bart.openConfig();
            return;
        }
        if (!debuggerInstance) {
            debuggerInstance = new Debugger(Bart.getOptions());
        }
        debuggerInstance.toggle();
    },
    toggleBreakpoint() {
        if (debuggerInstance && debuggerInstance.isActive()) {
            const editor = atom.workspace.getActiveTextEditor();
            const path = editor.getPath();
            const {row} = editor.getCursorBufferPosition();
            debuggerInstance.toggleBreakpoint(editor, path, row);
        } else {
            atom.notifications.addWarning('Debugger is not actived');
        }
    },
    openCreateNewCartridgeView() {
        if (Bart.newCartridgePanel.isVisible()) {
            Bart.newCartridgePanel.hide();
        } else {
            Bart.newCartridgePanel.show();
        }
    },
    createDWRECartridge(options) {

        const cartridgeName = 'cartridgename' in options ? options.cartridgename : '';
        const regexPattern = /^[a-zA-Z0-9_]+/;

        //Validate if Valid DWRE cartridgeName
        if (cartridgeName && regexPattern.test(cartridgeName)) {
            const cartridgePath = 'cartridgepath' in options ? options.cartridgepath : '';
            if (cartridgePath && cartridgePath.length) {
                const completeCartridgePath = path.join(cartridgePath, cartridgeName);
                try {
                    //Handle scenario of DIR_EXISTS & DIR_NOT_FOUND in catch block
                    fs.mkdirSync(completeCartridgePath);
                    const result = Bart.makeDirectory(completeCartridgePath, cartridgeName);

                    if (result) {

                        Bart.newCartridgePanel.hide();
                        Bart.newCartridgeView.clean();
                        atom.notifications.addSuccess('Successfully created Cartridge ' + cartridgeName);

                        //If enabled, add the newly added cartridgePath to current ATOM workspace
                        if (options.addtoproject) {
                            atom.project.addPath(completeCartridgePath);
                        }

                        //If enabled, link(upload) the newly created cartridge to DWRE server
                        if (options.uploadaftercreate) {
                            const bartOptions = Bart.getOptions();
                            if (!bartOptions.password) {
                                Bart.openConfig();
                                return;
                            }
                            const WebDav = require('./webdav');
                            const webdav = new WebDav(bartOptions, log);

                            let prefMsg = null;
                            const notify = (msg) => {
                                if (prefMsg) {
                                    Bart.progressMsg.remove(prefMsg);
                                }
                                Bart.progressMsg.add(msg);
                                prefMsg = msg;
                            }

                            //Upload the newly created empty Cartridge(DIR)
                            webdav
                            .uploadCartridges(completeCartridgePath, notify, {isCartridge: true, isDirectory: true})
                            .subscribe(
                                () => {},
                                err => {
                                    atom.notifications.addError(err);
                                },
                                () => {
                                    Bart.progressMsg.clear();
                                    atom.notifications.addSuccess('Successfully uploaded Cartridge ' + cartridgeName);
                                }
                            );
                        }
                    } else {
                        atom.notifications.addError('Error creating cartridge. Please see console log for more detailed message');
                    }
                } catch (err) {
                    if (err.code === 'EEXIST') {
                        atom.notifications.addError('Cartridge at given path already exists');
                    } else if (err.code === 'ENOENT') {
                        atom.notifications.addError('Directory Path does not exists');
                    } else {
                        atom.notifications.addError(err.message);
                    }
                }
            } else {
                atom.notifications.addError("Invalid cartridgePath");
            }
        } else {
            atom.notifications.addError("Invalid cartridgeName");
        }
    },
    makeDirectory : (completeCartridgePath, cartridgeName) => {

        let success = true;
        const directoriesToCreate = [
            path.join(completeCartridgePath, "cartridge"),
            path.join(completeCartridgePath, "cartridge", "forms"),
            path.join(completeCartridgePath, "cartridge", "forms", "default"),
            path.join(completeCartridgePath, "cartridge", "pipelines"),
            path.join(completeCartridgePath, "cartridge", "scripts"),
            path.join(completeCartridgePath, "cartridge", "static"),
            path.join(completeCartridgePath, "cartridge", "static", "default"),
            path.join(completeCartridgePath, "cartridge", "templates"),
            path.join(completeCartridgePath, "cartridge", "templates", "default"),
            path.join(completeCartridgePath, "cartridge", "templates", "resources"),
            path.join(completeCartridgePath, "cartridge", "webreferences"),
            path.join(completeCartridgePath, "cartridge", "webreferences2")
        ]

        directoriesToCreate.forEach(directory => {
            try {
                fs.mkdirSync(directory);
            } catch (err) {
                success = false;
            }
        })

        if (success) {
            const promiseArray = [
                Bart.createProjectPropertiesFile(completeCartridgePath, cartridgeName),
                Bart.createCartridgePropertiesFile(completeCartridgePath, cartridgeName)
            ]

            Promise.all(promiseArray).then( () => {
                log('success');
            }, (err) => {
                log(err);
            });
        }
        return success;
    },
    createProjectPropertiesFile : (completeCartridgePath, cartridgeName) => {

        const completeProjectFilePath = path.join(completeCartridgePath, '.project');
        let projectFileContent = `<?xml version="1.0" encoding="UTF-8"?>
                                    <projectDescription>
                                        <name>%s</name>
                                        <comment></comment>
                                        <projects>
                                        </projects>
                                        <buildSpec>
                                            <buildCommand>
                                                <name>com.demandware.studio.core.beehiveElementBuilder</name>
                                                <arguments>
                                                </arguments>
                                            </buildCommand>
                                            <buildCommand>
                                                <name>org.eclipse.xtext.ui.shared.xtextBuilder</name>
                                                <arguments>
                                                </arguments>
                                            </buildCommand>
                                        </buildSpec>
                                        <natures>
                                            <nature>com.demandware.studio.core.beehiveNature</nature>
                                            <nature>org.eclipse.xtext.ui.shared.xtextNature</nature>
                                        </natures>
                                    </projectDescription>
                                    `
        projectFileContent = util.format(projectFileContent, cartridgeName);

        return new Promise((resolve, reject) => {

            fs.writeFile(completeProjectFilePath, projectFileContent, function(error) {
                if (error) {
                    reject(error);
                }
                resolve("successfully added properties file");
            });
        });
    },
    createCartridgePropertiesFile : (completeCartridgePath, cartridgeName) => {

        const cartridgePropertiesFilePath = path.join(completeCartridgePath, 'cartridge', util.format('%s.properties', cartridgeName));
        let cartridgePropertiesFileContent = `demandware.cartridges.%s.id=%s
demandware.cartridges.%s.multipleLanguageStorefront=true`
        cartridgePropertiesFileContent = util.format(cartridgePropertiesFileContent, cartridgeName, cartridgeName, cartridgeName);

        return new Promise( (resolve, reject) => {
            fs.writeFile(cartridgePropertiesFilePath, cartridgePropertiesFileContent, function(error) {
                if (error) {
                    reject(error);
                }
                resolve("successfully added properties file");
            });
        });
    },
    toggleAutoBuild : () => {
        if (atom.config.get('Bart.autoBuildEnabled')) {
            atom.config.set('Bart.autoBuildEnabled', false);
            atom.notifications.addWarning('Successfully disabled auto build functionality');
        }
        else {
            atom.config.set('Bart.autoBuildEnabled', true);
            atom.notifications.addSuccess('Successfully enabled auto build functionality');
        }
    }
};

module.exports = Bart;
module.exports.config = require('./config');
