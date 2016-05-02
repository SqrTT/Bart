
# Bart

Demandware file uploader & script debugger


### Usage

After installing Bart package, in Atom appear additional item in main menu with same name `Bart`. This item contain three subitems:

* Upload all cartridges - actually upload all cartridges to the sandbox (zip, upload and unzip on SB). Currently only first folder in project will be uploaded.
* Open settings... - Opens configuration of current sandbox like a hostname, username, password, codeversion and list of files that should be watched. Last option is used to watch files that should be uploaded to SB when change by some other program i.e. on build and minify by gulp/grant, and  is not opened in IDE. Each file should have absolute path and can end by mask i.e. `/.../cartridges/app_core/cartridge/static/default/js/*`
* Open/close debugger - simply toggle debugger's panel.

To start debug you heed to set breakpoint first. To do so, just open file set text cursor in required place and press F9. After breakpoint is set open in browser required page. You will see that page is loading too long. So it's time to press `Manual Update` button in debugger panel (last button in row). After that you should see stack trace and list of variables.
Other buttons should be obvious.

Also in context menu of file/editor you will see two additional items: upload file and toggle breakpoint.


It's recommended to install also [language-demandware](https://atom.io/packages/language-demandware) for syntax highlight of Demandware files.
