'use babel';

/** @jsx elementCreator */
import {domElement as elementCreator} from './elementCreator';
import EventEmitter from 'events';

export default class NewCartridgeView {
    constructor () {
        this.emitter = new EventEmitter();
        this.el =
        <div class='b-bart-new-cartridge'>
            <div class='block'>
                <label>Create New Demandware Cartridge</label>
            </div>
            <div class='block'>
                <div class='controls'>
                    <label class='control-label'>
                        cartridgename
                    </label>
                    <div class='controls'>
                        <div class='editor-container'>
                            <atom-text-editor mini='' class='mini editor bart-cartridgename'
                                tabindex='1' id='bart-cartridgename'
                                placeholder-text='int_cartridge_name'
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div class='block'>
                <div class='controls'>
                    <label class='control-label'>
                        cartridgepath
                    </label>
                    <div class='controls'>
                        <div class='editor-container'>
                            <atom-text-editor mini='' class='mini editor bart-cartridgepath'
                                tabindex='1' id='bart-cartridgepath'
                                placeholder-text='/Users/Username/path/to/codebase/'
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div class='block'>
                <div class="controls">
                    <div class="checkbox">
                        <label for="bart-uploadaftercreate">
                            <input id="bart-uploadaftercreate"
                                type="checkbox"
                                class="bart-uploadaftercreate" />
                            <div class="setting-title">Upload cartridge to demandware server(Only works if already connected with DWRE server)</div>
                        </label>
                    </div>
                </div>
            </div>
            <div class='block'>
                <div class="controls">
                    <div class="checkbox">
                        <label for="bart-addtoproject">
                            <input id="bart-addtoproject"
                                type="checkbox"
                                class="bart-addtoproject" />
                            <div class="setting-title">Automatically add newly created cartridge to current workspace/project</div>
                        </label>
                    </div>
                </div>
            </div>
            <div class='block'>
                <button class='btn' onClick={this.onCreate.bind( this )} >Create</button>
                <button class='btn' onClick={this.onCancel.bind( this )}>Cancel</button>
                <div class='error-messages js-bart_error' ></div>
            </div>
        </div>;
    }
    setError ( msg = '' ) {
        const div = this.el.getElementsByClassName( 'js-bart_error' );
        if ( div && div.length )
        {
            div[0].textContent = msg;
        }
    }

    on ( name, fn ) {
        this.emitter.on( name, fn );
    }
    off ( name, fn ) {
        this.emitter.off( name, fn );
    }
    clean () {
        this.el.getElementsByClassName('bart-cartridgename')[0].getModel().setText('');
        this.el.getElementsByClassName('bart-cartridgepath')[0].getModel().setText('');
        this.el.getElementsByClassName('bart-uploadaftercreate')[0].checked = false;
        this.el.getElementsByClassName('bart-addtoproject')[0].checked = false;
    }
    onCancel () {
        this.emitter.emit( 'cancel' );
    }
    onCreate () {
        const config = [
            'cartridgename',
            'cartridgepath',
            'uploadaftercreate',
            'addtoproject'
        ].reduce( ( acc, elemClass ) =>
         {
            const div = this.el.getElementsByClassName( 'bart-' + elemClass );
            if ( div && div.length ) {
                 if (div[0].type === 'checkbox') {
                     acc[elemClass] = div[0].checked;
                 } else {
                     acc[elemClass] = div[0].getModel().getText() || '';
                 }
            }
            return acc;
        }, {} );
        this.emitter.emit( 'create', config );
    }
    getElement() {
        return this.el;
    }
}
