//BartView = require './bart-view'
'use strict';

const atomP = require('atom'),
    path = require('path');

const subscriptions = new atomP.CompositeDisposable();

const Bart = {

    activate : (state) => {
        console.log('bart live');
        subscriptions.add(atom.commands.add('atom-workspace', {
                'bart:uploadFile': Bart.uploadFile,
                'bart:uploadAll': Bart.uploadAll,
                'bart:openConfig': Bart.openConfig
            })
        );
    },
    deactivate : () => {
        subscriptions.dispose();
    },
    serialize : () => {

    },
    uploadFile : function (event) {
        console.log('bart live: uploadFile');

        const _get = require('lodash/get'),
            filePath = _get(event, 'target.model.buffer.file.path');

        const currentRoot = atom.project.getPaths().find((path) => filePath.indexOf(path) === 0);

        if (filePath) {
            const WebDav = require('./webdav');
            const webdav = new WebDav({root: currentRoot});
            webdav.post(filePath).then(() => {
                console.log('success');
            });
        }
    },
    uploadAll: () => {
        console.log('bart live: uploadAll');

        const WebDav = require('./webdav');
        const webdav = new WebDav({});

        const notify = (msg) => {
            console.info(msg);
        }

        const paths = atom.project.getDirectories().map((dir) =>
                webdav.uploadCartridges(dir.getPath(), notify));

        Promise.all(paths).then(() => {
            console.log('success');
        }, (err) => {
            console.error(err);
        });
    },
    openConfig: () => {
        console.log('bart live: openConfig');

        const WebDav = require('./webdav');
        const webdav = new WebDav({});
        webdav.unzip('/home/sqrtt/git/ecom-anh/cartridges/cartridges.zip').then(() => {
            console.log('success');
        });
    }
};

module.exports = Bart;

/*Bart =
  bartView: null
  modalPanel: null
  subscriptions: null

  activate: (state) ->
    @bartView = new BartView(state.bartViewState)
    @modalPanel = atom.workspace.addModalPanel(item: @bartView.getElement(), visible: false)

    # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable

    # Register command that toggles this view
    @subscriptions.add atom.commands.add 'atom-workspace', 'bart:toggle': => @toggle()

  deactivate: ->
    @modalPanel.destroy()
    @subscriptions.dispose()
    @bartView.destroy()

  serialize: ->
    bartViewState: @bartView.serialize()

  toggle: ->
    console.log 'Bart was toggled!'

    if @modalPanel.isVisible()
      @modalPanel.hide()
    else
      @modalPanel.show()
*/
