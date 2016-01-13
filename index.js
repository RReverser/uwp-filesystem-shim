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
        this.constructor._eventTypes.forEach(type => {
            this._listeners[type] = new Set();
            this[`_on${type}`] = null;
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
    static _defineEventAttr(key) {
        const type = key.slice(2);
        const privateKey = `_${key}`;
        (this._eventTypes || (this._eventTypes = [])).push(type);
        Object.defineProperty(this.prototype, key, {
            configurable: true,
            enumerable: true,
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
}
function progressEvent(target, key) {
    target.constructor._defineEventAttr(key);
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
function readonly(target, key) {
    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        set(value) {
            Object.defineProperty(this, key, {
                configurable: false,
                enumerable: true,
                value
            });
        }
    });
}
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
function createStorageEntry(filesystem, storageItem) {
    let CustomStorageEntry = storageItem.isOfType(Windows.Storage.StorageItemTypes.file) ? StorageFileEntry : StorageDirectoryEntry;
    return new CustomStorageEntry(filesystem, storageItem);
}
class StorageEntry {
    constructor(filesystem, _storageItem) {
        this._storageItem = _storageItem;
        this.filesystem = filesystem;
    }
    get name() {
        return this._storageItem.name;
    }
    get fullPath() {
        return this._storageItem.path;
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
        let fs = this.filesystem;
        return `ms-appdata:///${fs.name}/${this._storageItem.path.slice(fs.root.fullPath.length + 1).replace(/\\/g, '/')}`;
    }
    remove(onSuccess, onError) {
        this._storageItem.deleteAsync().done(onSuccess, onError);
    }
    getParent(onSuccess, onError) {
        this._storageItem.getParentAsync().done(parent => onSuccess(parent ? new StorageDirectoryEntry(this.filesystem, parent) : this.filesystem.root), onError);
    }
}
__decorate([
    readonly
], StorageEntry.prototype, "isFile", void 0);
__decorate([
    readonly
], StorageEntry.prototype, "isDirectory", void 0);
__decorate([
    readonly
], StorageEntry.prototype, "filesystem", void 0);
class StorageDirectoryEntry extends StorageEntry {
    constructor(...args) {
        super(...args);
        this.isFile = false;
        this.isDirectory = true;
    }
    createReader() {
        return new StorageDirectoryReader(this.filesystem, this._storageItem);
    }
    _getItem(createItemAsync, getItemAsync, path, options, onSuccess, onError) {
        let collisionOpt = Windows.Storage.CreationCollisionOption;
        (options.create
            ? createItemAsync.call(this._storageItem, path, options.exclusive ? collisionOpt.failIfExists : collisionOpt.openIfExists)
            : getItemAsync.call(this._storageItem, path)).done((storageItem) => onSuccess(createStorageEntry(this.filesystem, storageItem)), onError);
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
        this._storageFolder.getItemsAsync().done(items => onSuccess(items.map(item => createStorageEntry(this._filesystem, item))), onError);
    }
}
class StorageFileEntry extends StorageEntry {
    constructor(...args) {
        super(...args);
        this.isFile = true;
        this.isDirectory = false;
    }
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
__decorate([
    readonly
], StorageFileSystem.prototype, "name", void 0);
__decorate([
    readonly
], StorageFileSystem.prototype, "root", void 0);
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
StorageFileWriter.INIT = 0 /* INIT */;
StorageFileWriter.WRITING = 1 /* WRITING */;
StorageFileWriter.DONE = 2 /* DONE */;
__decorate([
    readonly
], StorageFileWriter.prototype, "INIT", void 0);
__decorate([
    readonly
], StorageFileWriter.prototype, "WRITING", void 0);
__decorate([
    readonly
], StorageFileWriter.prototype, "DONE", void 0);
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
__decorate([
    readonly
], StorageFileWriter, "INIT", void 0);
__decorate([
    readonly
], StorageFileWriter, "WRITING", void 0);
__decorate([
    readonly
], StorageFileWriter, "DONE", void 0);
const TEMPORARY = 0;
const PERSISTENT = 1;
const appData = Windows.Storage.ApplicationData.current;
const fileSystemResolvers = [
        () => new StorageFileSystem('temp', appData.temporaryFolder),
        () => new StorageFileSystem('local', appData.localFolder)
].map((createFS, i, resolvers) => () => {
    let fs = createFS();
    resolvers[i] = () => fs;
    return fs;
});
var requestFileSystem = function requestFileSystem(type, size, onSuccess, onError) {
    onSuccess(fileSystemResolvers[type]());
};
var resolveLocalFileSystemURL = function resolveLocalFileSystemURL(url, onSuccess, onError) {
    let match = url.match(/^ms-appdata:\/{3}(local|temp)\//);
    if (!match) {
        onError(new SecurityError());
    }
    let type = match[1] === 'local' ? PERSISTENT : TEMPORARY;
    Windows.Storage.StorageFile.getFileFromApplicationUriAsync(new Windows.Foundation.Uri(url))
        .done(file => new StorageFileEntry(fileSystemResolvers[type](), file), onError);
};
