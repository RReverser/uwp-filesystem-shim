try {
    new ProgressEvent('test');
}
catch (err) {
    let proto = ProgressEvent.prototype;
    ProgressEvent = proto.constructor = function (type, eventInitDict = {}) {
        let event = document.createEvent('ProgressEvent');
        event.initProgressEvent(type, eventInitDict.bubbles, eventInitDict.cancelable, eventInitDict.lengthComputable, eventInitDict.loaded, eventInitDict.total);
        return event;
    };
    ProgressEvent.prototype = proto;
}
class ProgressEventTarget {
    constructor() {
        this._listeners = Object.create(null);
        this.constructor._privateListenerKeys.forEach(privateKey => {
            this[privateKey] = null;
        });
    }
    addEventListener(type, listener) {
        if (typeof listener === 'function') {
            this._listeners[type].add(listener);
        }
    }
    dispatchEvent(event) {
        this._listeners[event.type].forEach(listener => listener.call(this, event));
        return !event.defaultPrevented;
    }
    removeEventListener(type, listener) {
        this._listeners[type].delete(listener);
    }
}
function progressEvent(target, key) {
    const privateKey = `_${key}`;
    let Ctor = target.constructor;
    (Ctor._privateListenerKeys || (Ctor._privateListenerKeys = [])).push(privateKey);
    const type = key.slice(2);
    Object.defineProperty(target, key, {
        get() {
            return this[privateKey];
        },
        set(handler) {
            // .onstuff = ... firstly removes the old handler if present
            let normalizedHandler = this[privateKey];
            if (normalizedHandler !== null) {
                this.removeEventListener(type, normalizedHandler);
            }
            if (typeof handler === 'function') {
                // then adds the new handler if it's callable
                normalizedHandler = target => {
                    if (handler.call(target, event) === false) {
                        event.preventDefault();
                    }
                };
                this.addEventListener(type, normalizedHandler);
            }
            else {
                // or simply sets .onstuff value to null if non-callable
                normalizedHandler = null;
            }
            this[privateKey] = normalizedHandler;
        }
    });
}
class AbortError extends DOMError {
}
class InvalidStateError extends DOMError {
}
class NoModificationAllowedError extends DOMError {
}
class SecurityError extends DOMError {
}
class NotImplementedError extends Error {
    constructor() {
        super('Not implemented.');
    }
}
class StorageEntry {
    constructor(_filesystem, _storageItem) {
        this._filesystem = _filesystem;
        this._storageItem = _storageItem;
    }
    get isFile() {
        return this._storageItem.isOfType(Windows.Storage.StorageItemTypes.file);
    }
    get isDirectory() {
        return this._storageItem.isOfType(Windows.Storage.StorageItemTypes.folder);
    }
    get name() {
        return this._storageItem.name;
    }
    get fullPath() {
        return this._storageItem.path;
    }
    get filesystem() {
        return this._filesystem;
    }
    static from(filesystem, storageItem) {
        let CustomStorageEntry = storageItem.isOfType(Windows.Storage.StorageItemTypes.file) ? StorageFileEntry : StorageDirectoryEntry;
        return new CustomStorageEntry(filesystem, storageItem);
    }
    getMetadata(onSuccess, onError) {
        this._storageItem.getBasicPropertiesAsync().done(props => onSuccess({ modificationTime: props.dateModified, size: props.size }), onError);
    }
    moveTo(parent, newName, onSuccess, onError) {
        throw new NotImplementedError();
    }
    copyTo(parent, newName, onSuccess, onError) {
        throw new NotImplementedError();
    }
    toURL() {
        let fs = this._filesystem;
        return `ms-appdata:///${fs.name}/${this._storageItem.path.slice(fs.root.fullPath.length + 1).replace(/\\/g, '/')}`;
    }
    remove(onSuccess, onError) {
        this._storageItem.deleteAsync().done(onSuccess, onError);
    }
    getParent(onSuccess, onError) {
        this._storageItem.getParentAsync().done(parent => onSuccess(parent ? new StorageDirectoryEntry(this._filesystem, parent) : this._filesystem.root), onError);
    }
}
class StorageDirectoryEntry extends StorageEntry {
    createReader() {
        return new StorageDirectoryReader(this._filesystem, this._storageItem);
    }
    _getItem(createItemAsync, getItemAsync, path, options, onSuccess, onError) {
        let collisionOpt = Windows.Storage.CreationCollisionOption;
        (options.create
            ? createItemAsync.call(this._storageItem, path, options.exclusive ? collisionOpt.failIfExists : collisionOpt.openIfExists)
            : getItemAsync.call(this._storageItem, path)).done((storageItem) => onSuccess(StorageEntry.from(this._filesystem, storageItem)), onError);
    }
    getFile(path, options, onSuccess, onError) {
        this._getItem(this._storageItem.createFileAsync, this._storageItem.getFileAsync, path, options, onSuccess, onError);
    }
    getDirectory(path, options, onSuccess, onError) {
        this._getItem(this._storageItem.createFolderAsync, this._storageItem.getFolderAsync, path, options, onSuccess, onError);
    }
    remove(onSuccess, onError) {
        this._storageItem.getItemsAsync(0, 1).then(({ length }) => {
            if (length > 0) {
                onError && onError(new NoModificationAllowedError());
                return;
            }
            return super.remove(onSuccess, onError);
        });
    }
    removeRecursively(onSuccess, onError) {
        this.remove(onSuccess, onError);
    }
}
class StorageDirectoryReader {
    constructor(_filesystem, _storageFolder) {
        this._filesystem = _filesystem;
        this._storageFolder = _storageFolder;
        this._read = false;
    }
    readEntries(onSuccess, onError) {
        this._read = true;
        this._storageFolder.getItemsAsync().done(items => onSuccess(items.map(item => StorageEntry.from(this._filesystem, item))), onError);
    }
}
class StorageFileEntry extends StorageEntry {
    createWriter(onSuccess, onError) {
        this._storageItem.openAsync(Windows.Storage.FileAccessMode.readWrite)
            .then(stream => new StorageFileWriter(stream))
            .done(onSuccess, onError);
    }
    file(onSuccess, onError) {
        new WinJS.Promise(resolve => resolve(MSApp.createFileFromStorageFile(this._storageItem)))
            .done(onSuccess, onError);
    }
    moveTo(parent, newName, onSuccess, onError) {
        this._storageItem.moveAsync(parent._storageItem, newName, Windows.Storage.NameCollisionOption.failIfExists).done(() => onSuccess(this), onError);
    }
    copyTo(parent, newName, onSuccess, onError) {
        this._storageItem.copyAsync(parent._storageItem, newName, Windows.Storage.NameCollisionOption.failIfExists).done(() => onSuccess(this), onError);
    }
}
class StorageFileSystem {
    constructor(name, storageFolder) {
        this.name = name;
        this.root = new StorageDirectoryEntry(this, storageFolder);
    }
}
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
;
class StorageFileWriter extends ProgressEventTarget {
    constructor(_stream) {
        super();
        this._stream = _stream;
        this.INIT = 0 /* INIT */;
        this.WRITING = 1 /* WRITING */;
        this.DONE = 2 /* DONE */;
        this._readyState = 0 /* INIT */;
        this._error = null;
        this._writingProcess = null;
    }
    get readyState() {
        return this._readyState;
    }
    get error() {
        return this._error;
    }
    get position() {
        return this._stream.position;
    }
    get length() {
        return this._stream.size;
    }
    abort() {
        if (this._readyState === 2 /* DONE */ || this._readyState === 0 /* INIT */) {
            return;
        }
        this._writingProcess.cancel();
        this._error = new AbortError();
        this._writeEnd('abort');
    }
    seek(offset) {
        if (this._readyState === 1 /* WRITING */) {
            throw new InvalidStateError();
        }
        let { length } = this;
        if (offset > length) {
            offset = length;
        }
        if (offset < 0) {
            offset += length;
        }
        if (offset < 0) {
            offset = 0;
        }
        this._stream.seek(offset);
    }
    _writeStart() {
        if (this._readyState === 1 /* WRITING */) {
            throw new InvalidStateError();
        }
        this._readyState = 1 /* WRITING */;
        this._error = null;
        this.dispatchEvent(new ProgressEvent('writestart'));
    }
    _writeEnd(status) {
        this._readyState = 2 /* DONE */;
        this._writingProcess = null;
        this.dispatchEvent(new ProgressEvent(status));
        this.dispatchEvent(new ProgressEvent('writeend'));
    }
    _writeProgress(loaded, total) {
        this.dispatchEvent(new ProgressEvent('progress', {
            lengthComputable: true,
            loaded,
            total
        }));
    }
    _write(write) {
        this._writeStart();
        this._writingProcess = write(this._stream);
        this._writingProcess.done(() => this._writeEnd('write'), err => {
            // TODO: check whether this is required
            if (this._error instanceof AbortError) {
                return;
            }
            this._error = err;
            this._writeEnd('error');
        });
    }
    truncate(newLength) {
        this._write(stream => {
            stream.size = newLength;
            return stream.flushAsync().then(() => {
                if (this._stream.position > newLength) {
                    this._stream.position = newLength;
                }
            });
        });
    }
    write(data) {
        let { size } = data;
        this._write(stream => Windows.Storage.Streams.RandomAccessStream.copyAsync(data.msDetachStream(), stream).then(() => this._writeProgress(size, size), null, written => this._writeProgress(written, size)));
    }
}
__decorate([
    progressEvent
], StorageFileWriter.prototype, "onwritestart", void 0);
__decorate([
    progressEvent
], StorageFileWriter.prototype, "onprogress", void 0);
__decorate([
    progressEvent
], StorageFileWriter.prototype, "onwrite", void 0);
__decorate([
    progressEvent
], StorageFileWriter.prototype, "onabort", void 0);
__decorate([
    progressEvent
], StorageFileWriter.prototype, "onerror", void 0);
__decorate([
    progressEvent
], StorageFileWriter.prototype, "onwriteend", void 0);
const TEMPORARY = 0;
const PERSISTENT = 1;
const appData = Windows.Storage.ApplicationData.current;
const fileSystems = [
    new StorageFileSystem('temp', appData.temporaryFolder),
    new StorageFileSystem('local', appData.localFolder)
];
var requestFileSystem = function requestFileSystem(type, size, onSuccess, onError) {
    onSuccess(fileSystems[type]);
};
var resolveLocalFileSystemURL = function resolveLocalFileSystemURL(url, onSuccess, onError) {
    let match = url.match(/^ms-appdata:\/{3}(local|temp)\//);
    if (!match) {
        onError(new SecurityError());
    }
    Windows.Storage.StorageFile.getFileFromApplicationUriAsync(new Windows.Foundation.Uri(url))
        .done(file => new StorageFileEntry(fileSystems[match[1] === 'local' ? 1 : 0], file), onError);
};
