'use babel'


import ProgressView from './ProgressView';
import OptionsView from './OptionsView';

const atomP = require('atom'),
    path = require('path'),
    subscriptions = new atomP.CompositeDisposable();

const Bart = {
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
            'version'
        ].reduce((acc, key) => {
            if (key === 'password') {
                acc[key] = sessionStorage['bart-' + key];
            } else {
                acc[key] = localStorage['bart-' + key];
            }
            return acc;
        }, {})
    },
    activate : (state) => {
        console.log('bart live');
        subscriptions.add(atom.commands.add('atom-workspace', {
                'bart:uploadFile': Bart.uploadFile,
                'bart:uploadAll': Bart.uploadAll,
                'bart:openConfig': Bart.openConfig
            })
        );
        atom.workspace.observeTextEditors(editor => {
            editor.onDidSave((params) => {
                console.log('on save');
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
                }, (err) => {
                    this.optionsView.setError(err);
                });
            } else {
                this.optionsView.setError('Code version must not be empty');
            }
        });
    },
    deactivate : () => {
        subscriptions.dispose();
    },
    serialize : () => {

    },
    saveFile : (fileName) => {
        const options = Bart.getOptions();
        if (!options.password) {
            Bart.openConfig();
            return;
        }
        const currentRoot = atom.project.getPaths().find((path) => fileName.indexOf(path) === 0);

        const WebDav = require('./webdav');
        const webdav = new WebDav(Object.assign({
            root: currentRoot
        }, options));
        this.progressMsg.setMessage(`Uploading file: "${path.basename(fileName)}" ...`);
        this.progressPanel.show();

        webdav.post(fileName).then(() => {
            console.log('success');
            this.progressPanel.hide();
        }, (err) => {
            this.progressMsg.setError(err);
            setTimeout(() => this.progressPanel.hide(), 10000);
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

        const paths = atom.project.getDirectories().map((dir) =>
                webdav.uploadCartridges(dir.getPath(), notify));

        Promise.all(paths).then(() => {
            console.log('success');
            this.progressPanel.hide();
        }, (err) => {
            console.error(err);
            this.progressMsg.setError(err);
            setTimeout(() => this.progressPanel.hide(), 10000);
        });
    },
    openConfig: () => {
        if (this.optionsPanel.isVisible()) {
            this.optionsPanel.hide();
        } else {
            this.optionsPanel.show();
        }
    }
};

module.exports = Bart;


