'use babel';

/** @jsx elementCreator */
import {domElement as elementCreator} from './elementCreator';
import EventEmitter from 'events';

const path = require('path'),
      fs = require('fs');

export default class OptionsView {
    constructor (currentOptions = {}) {
        this.isChecked = true;
        this.currentOptions = currentOptions;
        this.emitter = new EventEmitter();
        this.cartridges = {
            all: [],
            checked: []
        };
        this.el =
        <div class="b-bart-options">
            <div class="bart-options-main">
                <div class='block'>
                    <label>Credentials for sandbox</label>
                </div>
                <div class='block'>
                    <div class="controls">
                        <label class="control-label">
                            HostName
                        </label>
                        <div class="controls">
                            <div class="editor-container">
                                <atom-text-editor mini="" class="mini editor bart-hostname"
                                    tabindex="1" id="bart-hostname"
                                    placeholder-text="some.demandware.net"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div class='block'>
                    <div class="controls">
                        <label class="control-label">
                            UserName
                        </label>
                        <div class="controls">
                            <div class="editor-container">
                                <atom-text-editor mini="" class="mini editor bart-username"
                                    tabindex="2" id="bart-username"
                                    placeholder-text="Your username on sandbox"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div class='block'>
                    <div class="controls">
                        <label class="control-label">
                            Password
                        </label>
                        <div class="controls">
                            <div class="editor-container">
                                <input type="password" class="mini editor b-bart_password_input"
                                    tabindex="3" id="bart-password"
                                    placeholder-text="password"
                                    onKeyDown={this.handleKeyPress.bind(this)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div class='block'>
                    <div class="controls">
                        <label class="control-label">
                            Code version
                        </label>
                        <div class="controls">
                            <div class="editor-container">
                                <atom-text-editor mini="" class="mini editor bart-version"
                                    tabindex="4" id="bart-codeversion"
                                    placeholder-text="Current code version"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div class='block'>
                    <div class='bart-list-container'>
                        <label>Cartridges found in project</label>
                        <div class="control-group">
                            <button tabindex="5" class="btn bart-btn-all" onClick={this.setAll.bind(this)}>Deselect All</button>
                        </div>
                        <div class="cartridgelist-div-list">
                            <ul tabindex="6" class="cartridgelist-ul">
                            </ul>
                        </div>
                    </div>
                </div>
                <div class='block'>
                    <div class="controls">
                        <label class="control-label">
                            List of files that should be wathched (separated by new line)
                        </label>
                        <div class="controls">
                            <div class="editor-container">
                                <atom-text-editor class="mini editor bart-watchlist"
                                    tabindex="7" id="bart-watchlist"
                                    placeholder-text="File list (absolute path)"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class='block'>
                <div class="control-group">
                    <div class="controls">
                        <div class="checkbox">
                            <label for="bart-uploadaftersave">
                                <input id="bart-uploadaftersave"
                                    tabindex="8"
                                    type="checkbox"
                                    checked="checked"
                                    class="bart-uploadaftersave" />
                                <div class="setting-title">Upload all after save</div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            <div class='block'>
                <div class="control-group">
                    <div class="controls">
                        <div class="checkbox">
                            <label for="bart-saveconfigtofile">
                                <input id="bart-saveconfigtofile"
                                    tabindex="9"
                                    type="checkbox"
                                    checked="checked"
                                    class="bart-saveconfigtofile" />
                                <div class="setting-title">Save config in root folder (Config file 'dw.json')</div>
                            </label>
                        </div>
                    </div>
                </div>
                <div class='block'>
                    <button class="btn" onClick={this.onSave.bind(this)} >Save</button>
                    <button class="btn" onClick={this.onCancel.bind(this)}>Cancel</button>
                    <div class="error-messages js-bart_error" ></div>
                </div>
            </div>
        </div>;
        [
            'hostname',
            'username',
            'version',
            'watchlist',
            'uploadaftersave',
            'saveconfigtofile'
        ].forEach((key) => {
            const div = this.el.getElementsByClassName('bart-' + key);
            if (div && div.length) {
                if (div[0].type === 'checkbox') {
                    div[0].checked = currentOptions[key] === 'true';
                } else {
                    div[0].getModel().setText(currentOptions[key] || '');
                }
            }
        });
        this.cartridgeList = this.el.getElementsByClassName('cartridgelist-ul')
                             .item(0);
    }
    displayAvailable() {
        this.isChecked = true;
        if (this.currentOptions.cartridges &&
            this.currentOptions.cartridges.trim().length) {
            this.cartridges.checked = this.currentOptions.cartridges
                                      .split('\n');
        } else {
            this.cartridges.checked = [];
        }
        this.cartridges.all = [];
        this.cartridgeList.innerHTML = '';
        let dirs = atom.project.getDirectories();
        if (dirs.length) {
            dirs.forEach((dir) => {
                let path = dir.getPath();
                let name = path.split(path.sep).pop();
                if (this.isCartridge(dir) &&
                !this.cartridges.all.includes(name)) {
                    this.createCartridgeCheckbox(dir, '');
                } else {
                    this.checkChildDirectory(dir, '');
                }
            });
        }
    }
    checkChildDirectory(dir, relativePath) {
        let rpath = !relativePath ? '' : relativePath + path.sep;
        dir.getEntries((err, children) => {
            if (err) {
                this.setError(err);
            } else {
                children.forEach((child) => {
                    let name = child.getPath().split(path.sep).pop();
                    if (child.isDirectory() && this.isCartridge(child)
                        && !this.cartridges.all.includes(rpath + name)) {
                        this.createCartridgeCheckbox(child, rpath);
                    } else if (child.isDirectory() && !this.isCartridge(child) && name !== '.api') {
                        this.checkChildDirectory(child, rpath + name);
                    }
                });
            }
        });
    }
    createCartridgeCheckbox (dir, projectDir) {
        let name = projectDir + dir.getPath().split(path.sep).pop();
        let checked = this.cartridges && this.cartridges.checked &&
                      this.cartridges.checked.length &&
                      this.cartridges.checked.includes(name);
        if (!checked && this.isChecked) {
            this.isChecked = false;
            if (!this.btnAll) {
                this.btnAll = this.el.getElementsByClassName('bart-btn-all');
            }
            this.btnAll.innerHTML = 'Select All';
        }
        let ele =
            <li>
                <div class="bart-cartridgelist-item">
                    <input type="checkbox"
                        class="bart-cartridgelist-checkbox"
                        value={name}
                        name={name}
                        id={name}/>
                    <label for={name}>
                        {name}
                    </label>
                </div>
            </li>;
        let inp = ele.getElementsByClassName('bart-cartridgelist-checkbox');
        inp[0].checked = checked;
        this.cartridgeList.appendChild(ele);
        this.cartridges.all.push(name);
    }
    isCartridge(dirPath) {
        const regexPattern = /^[a-zA-Z0-9_]+/;
        if (dirPath.isDirectory()) {
            let pathName = dirPath.getPath().split(path.sep).pop();
            if (regexPattern.test(pathName) && dirPath
                .getSubdirectory('cartridge').existsSync()) {
                return true;
            }
        }
        return false;
    }
    setAll() {
        let cartElements = this.cartridgeList
                           .getElementsByClassName('bart-cartridgelist-checkbox');
        for (let x = 0; x < cartElements.length; x++) {
            if (cartElements[x].type &&
                cartElements[x].type.toLowerCase() === 'checkbox') {
                cartElements[x].checked = !this.isChecked;
            }
        }
        this.isChecked = !this.isChecked;
        if (!this.btnAll) {
            this.btnAll = this.el.getElementsByClassName('bart-btn-all');
        }
        this.btnAll[0].innerHTML = this.isChecked
                                   ? 'Deselect All' : 'Select All';
    }
    handleKeyPress(e) {
      if (e.code === 'Backspace') {
          e.target.value = e.target.value.substr(0, e.target.value.length - 1);
      }
    }
    setError (msg = '') {
        const div = this.el.getElementsByClassName('js-bart_error');
        if (div && div.length) {
            div[0].textContent = msg;
            if (msg !== '') {
                div[0].scrollIntoView();
            }
        }
    }
    clean () {
        const div = this.el.getElementsByClassName('bart-password');
        if (div && div.length) {
            div[0].value = '';
        }
    }
    on (name, fn) {
        this.emitter.on(name, fn);
    }
    off (name, fn) {
        this.emitter.off(name, fn);
    }
    onSave () {
        const config = [
            'hostname',
            'username',
            'password',
            'version',
            'watchlist',
            'cartridges',
            'uploadaftersave',
            'saveconfigtofile'
        ].reduce((acc, elemClass) => {
            if (elemClass === 'cartridges') {
              let cartElements = this.cartridgeList
              .getElementsByClassName('bart-cartridgelist-checkbox');
              acc['cartridges'] = '';
              for (let x = 0; x < cartElements.length; x++) {
                  if (cartElements[x].type && cartElements[x].type === 'checkbox'
                  && cartElements[x].checked) {
                      acc['cartridges'] += cartElements[x].value + '\n';
                  }
              }
            } else {
                const div = this.el.getElementsByClassName('bart-' + elemClass);
                if (div && div.length) {
                    if (div[0].type === 'checkbox') {
                        acc[elemClass] = div[0].checked;
                    } else if (div[0].type === 'password') {
                        acc[elemClass] = div[0].value;
                    } else {
                        acc[elemClass] = div[0].getModel().getText() || '';
                    }
                }
            }
            return acc;
        }, {});
        this.emitter.emit('save', config);
        this.currentOptions = config;
    }
    onCancel () {
        this.emitter.emit('cancel');
    }
    getElement() {
        return this.el;
    }
}
