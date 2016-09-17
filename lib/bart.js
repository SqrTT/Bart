'use babel'

if (!Promise.prototype.always) {
    Promise.prototype.always = function(onResolveOrReject) {
        return this.then(onResolveOrReject,
            function(reason) {
                onResolveOrReject(reason);
                throw reason;
            });
        };
}


import ProgressView from './ProgressView';
import OptionsView from './OptionsView';
import NewCartridgeView from './NewCartridgeView';
import Debugger from './Debugger';

const atomP = require('atom'),
    path = require('path'),
    subscriptions = new atomP.CompositeDisposable();

var watcher,
    debuggerInstance,
    timer,
    repo;

const path2DwPath = (fileName) => {
    const options = module.exports.getOptions();

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

const Bart = {
    initWatcher : () => {
        if (watcher) {
            watcher.close();
        }
        const opts = Bart.getOptions();

        if (typeof opts.watchlist === 'string' && opts.watchlist) {
            const chokidar = require('chokidar');
            watcher = chokidar.watch(null, {
                ignored: /[\/\\]\./,
                persistent: true,
                ignoreInitial: true,
                followSymlinks: false
            });
            opts.watchlist.split('\n').forEach(file => {
                if (file) {
                    watcher.add(file);
                }
            });
            watcher.on('change', path => Bart.saveFile(path));
            watcher.on('add', path => Bart.saveFile(path));
            //watcher.on('unlink', path => Bart.deleteFile(path));
        }
    },
    initRepo : () => {
        var currentBranch;
        const getRepo = () => {
            return repo || (() => {
                repo = atom.project.getRepositories()[0]
                if (repo) {
                    currentBranch = repo.getShortHead();
                    repo.onDidDestroy(() => {
                        repo = null;
                    });
                }
                return repo;
            })();
        }
        if (!getRepo()) {
            return;
        }


        timer = setInterval(() => {
            const localRepo = getRepo();
            if (localRepo && currentBranch !== localRepo.getShortHead()) {
                currentBranch = localRepo.getShortHead();
                Bart.uploadAll();
            }
        }, 5000);

    },
    setOptions : (options) => {
        Object.keys(options).forEach((key) => {
            if (key === 'password') {
                sessionStorage['bart-' + key] = options[key];
            } else {
                localStorage['bart-' + key] = options[key];
            }
        });
    },
    getOptions : () => {
        return [
            'password',
            'hostname',
            'username',
            'cartridges',
            'version',
            'watchlist',
            'uploadaftersave'
        ].reduce((acc, key) => {
            if (key === 'password') {
                acc[key] = sessionStorage['bart-' + key];
            } else {
                acc[key] = localStorage['bart-' + key];
            }
            return acc;
        }, {})
    },
    activate : () => {
        subscriptions.add(atom.commands.add('atom-workspace', {
                'bart:uploadFile': Bart.uploadFile,
                'bart:uploadAll': Bart.uploadAll,
                'bart:openConfig': Bart.openConfig,
                'bart:toggleDebugger' : Bart.toggleDebugger,
                'bart:toggleBreakpoint' : Bart.toggleBreakpoint,
                'bart:openCreateNewCartridgeView' : Bart.openCreateNewCartridgeView,
                'bart:resume' : () => debuggerInstance && debuggerInstance.resume(),
                'bart:stepover' : () => debuggerInstance && debuggerInstance.stepover(),
                'bart:stepin' : () => debuggerInstance && debuggerInstance.stepin(),
                'bart:stepout' : () => debuggerInstance && debuggerInstance.stepout()
            })
        );
        atom.workspace.observeTextEditors(editor => {
            editor.onDidSave((params) => {
                Bart.saveFile(params.path);
            });
        });
        this.progressMsg = new ProgressView();
        this.progressPanel = atom.workspace.addBottomPanel({
            item: this.progressMsg.getElement(),
            visible: false
        });

        this.optionsView = new OptionsView(Bart.getOptions());
        this.optionsPanel = atom.workspace.addModalPanel({
            item: this.optionsView.getElement(),
            visible: false
        });
        this.optionsView.on('cancel', () => {
            this.optionsPanel.hide();
        });
        this.optionsView.on('save', (options) => {
            const WebDav = require('./webdav');
            const webdav = new WebDav(options);
            if (options.version) {
                webdav.dirList().then(() => {
                    Bart.setOptions(options);
                    this.optionsView.clean();
                    this.optionsPanel.hide();
                    Bart.initWatcher();
                    this.optionsView.setError('');
                    if (options.uploadaftersave) {
                        Bart.uploadAll();
                    }
                }, (err) => {
                    this.optionsView.setError(err);
                });
            } else {
                this.optionsView.setError('Code version must not be empty');
            }
        });

        this.newCartridgeView = new NewCartridgeView();
        this.newCartridgePanel = atom.workspace.addModalPanel({
            item : this.newCartridgeView.getElement(),
            visible : false
        });
        this.newCartridgeView.on( 'cancel', () => {
            this.newCartridgePanel.hide();
        });

        this.newCartridgeView.on( 'create', ( options ) => {
            Bart.createDWRECartridge( options );
        });

        Bart.initWatcher();
        Bart.initRepo();
        console.log('bart alive!');
    },
    deactivate : () => {
        subscriptions.dispose();
        if (watcher) {
            watcher.close();
        }
        if (timer) {
            clearInterval(timer);
        }
        if (debuggerInstance && debuggerInstance.isActive()) {
            debuggerInstance.deactivate();
            debuggerInstance = undefined;
        }
    },
    serialize : () => {

    },
    saveFile : (fileName) => {
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
        }, options));
        this.progressMsg.setMessage(`Uploading file: "${path.basename(fileName)}" ...`);
        this.progressPanel.show();

        webdav.post(fileName).then(() => {
            this.progressPanel.hide();
        }, (err) => {
            this.progressMsg.setError(err);
            setTimeout(() => this.progressPanel.hide(), 10000);
            atom.notifications.addError(err);
        });
    },
    uploadFile : (event) => {
        const _get = require('lodash/get'),
            filePath = _get(event, 'target.model.buffer.file.path');

        if (filePath) {
            Bart.saveFile(filePath);
        }
    },
    uploadAll: () => {
        const options = Bart.getOptions();
        if (!options.password) {
            Bart.openConfig();
            return;
        }

        const WebDav = require('./webdav');
        const webdav = new WebDav(options);


        this.progressPanel.show();

        const notify = (msg) => {
            console.info(msg);
            this.progressMsg.setMessage(msg);
        }



        const paths = atom.project.getDirectories().map((dir) => {
            if (options.cartridges && options.cartridges.trim().length) {
                return options.cartridges
                    .split('\n')
                    .map(str => str.trim())
                    .reduce( (promise, cartridge) => {
                        return promise.then(() => {
                            return webdav.uploadCartridges(path.join(dir.getPath(), cartridge), notify, true);
                        });
                    }, Promise.resolve());
            } else {
                return webdav.uploadCartridges(dir.getPath(), notify);
            }
        });


        Promise.all(paths).then(() => {
            console.log('success');
            this.progressPanel.hide();
        }, (err) => {
            this.progressMsg.setError(err);
            atom.notifications.addError(err);
            setTimeout(() => this.progressPanel.hide(), 10000);
        });
    },
    openConfig: () => {
        if (this.optionsPanel.isVisible()) {
            this.optionsPanel.hide();
        } else {
            this.optionsPanel.show();
        }
    },
    toggleDebugger: () => {
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
    openCreateNewCartridgeView : () => {
        if (this.newCartridgePanel.isVisible()) {
            this.newCartridgePanel.hide();
        } else {
            this.newCartridgePanel.show();
        }
    },
    createDWRECartridge : (options) => {

        const cartridgeName = 'cartridgename' in options ? options.cartridgename : '';
        const regexPattern = /^[a-zA-Z0-9_]+/;

        if (regexPattern.test(cartridgeName)) {
            const cartridgePath = 'cartridgepath' in options ? options.cartridgepath : '';
            if (cartridgePath.length) {
                if (fs.exists(cartridgePath, (exists) => {
                        if (exists) {
                            const stats = fs.stat(cartridgePath, (err , stats) => {
                                if (stats.isDirectory()) {
                                    const completeCartridgePath = path.join(cartridgePath, cartridgeName);
                                    if (fs.exists(completeCartridgePath , (exists) => {
                                        if (!exists) {
                                            this.newCartridgePanel.hide();
                                            const result = Bart.makeDirectory(completeCartridgePath);
                                            if (result) {
                                                atom.notifications.addSuccess("Successfully created Cartridge " + cartridgeName);
                                            }
                                            else {
                                                atom.notifications.addError("Error creating cartridge. Please see console log for more detailed message");
                                            }
                                        }
                                        else {
                                            atom.notifications.addError("Cartridge at given path already exists");
                                        }
                                    }) );
                                }
                                else {
                                    atom.notifications.addError("Cartridge Path is not a directory");
                                }
                            } )
                        }
                        else {
                            atom.notifications.addError("Cartridge Path doesn't exists");
                        }
                }) );
            }
            else {
                atom.notifications.addError("Invalid cartridgePath");
            }
        }
        else {
            atom.notifications.addError("Invalid cartridgeName");
        }
    },
    makeDirectory : (completeCartridgePath) => {

        let success = true;
        directories_to_create = [
            completeCartridgePath,
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
            path.join(completeCartridgePath, "cartridge", "webreferences2"),
        ]
        for (let index in directories_to_create)
        {
            try{
                fs.mkdirSync(directories_to_create[index]);
            }catch(e){
                success = false;
                console.log(e.message);
                break;
            }
        }
        return success;
    }
};

module.exports = Bart;
