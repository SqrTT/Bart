//BartView = require './bart-view'
'use strict';

const atomP = require('atom');

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
    uploadFile :() => {
        console.log('bart live: uploadFile');

        const _get = require('lodash/get'),
            editor = atom.workspace.getActivePaneItem(),
            filePath = _get(editor, 'buffer.file.path');

        if (filePath) {
            const WebDav = require('./webdav');
            const webdav = new WebDav({});
            webdav.post(filePath).then(() => {
                console.log('success');
            });
        }
    },
    uploadAll: () => {
        console.log('bart live: uploadAll');
    },
    openConfig: () => {
        console.log('bart live: openConfig');
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
