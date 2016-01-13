try {
    new ProgressEvent('test');
}
catch (err) {
    var proto = ProgressEvent.prototype;
    ProgressEvent = proto.constructor = function (type, eventInitDict) {
        if (eventInitDict === void 0) { eventInitDict = {}; }
        var event = document.createEvent('ProgressEvent');
        event.initProgressEvent(type, eventInitDict.bubbles, eventInitDict.cancelable, eventInitDict.lengthComputable, eventInitDict.loaded, eventInitDict.total);
        return event;
    };
    ProgressEvent.prototype = proto;
}
var ProgressEventTarget = (function () {
    function ProgressEventTarget() {
        var _this = this;
        this._listeners = Object.create(null);
        this.constructor._eventTypes.forEach(function (type) {
            _this._listeners[type] = new Set();
            _this[("_on" + type)] = null;
        });
    }
    ProgressEventTarget.prototype.addEventListener = function (type, listener) {
        if (typeof listener === 'function') {
            this._listeners[type].add(listener);
        }
    };
    ProgressEventTarget.prototype.dispatchEvent = function (event) {
        var _this = this;
        this._listeners[event.type].forEach(function (listener) { return listener.call(_this, event); });
        return !event.defaultPrevented;
    };
    ProgressEventTarget.prototype.removeEventListener = function (type, listener) {
        this._listeners[type].delete(listener);
    };
    ProgressEventTarget._defineEventAttr = function (key) {
        var type = key.slice(2);
        var privateKey = "_" + key;
        (this._eventTypes || (this._eventTypes = [])).push(type);
        Object.defineProperty(this.prototype, key, {
            configurable: true,
            enumerable: true,
            get: function () {
                return this[privateKey];
            },
            set: function (handler) {
                // .onstuff = ... firstly removes the old handler if present
                var normalizedHandler = this[privateKey];
                if (normalizedHandler !== null) {
                    this.removeEventListener(type, normalizedHandler);
                }
                if (typeof handler === 'function') {
                    // then adds the new handler if it's callable
                    normalizedHandler = function (target) {
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
    };
    return ProgressEventTarget;
})();
function progressEvent(target, key) {
    target.constructor._defineEventAttr(key);
}
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AbortError = (function (_super) {
    __extends(AbortError, _super);
    function AbortError() {
        _super.apply(this, arguments);
    }
    return AbortError;
})(Error);
var InvalidStateError = (function (_super) {
    __extends(InvalidStateError, _super);
    function InvalidStateError() {
        _super.apply(this, arguments);
    }
    return InvalidStateError;
})(Error);
var NoModificationAllowedError = (function (_super) {
    __extends(NoModificationAllowedError, _super);
    function NoModificationAllowedError() {
        _super.apply(this, arguments);
    }
    return NoModificationAllowedError;
})(Error);
var SecurityError = (function (_super) {
    __extends(SecurityError, _super);
    function SecurityError() {
        _super.apply(this, arguments);
    }
    return SecurityError;
})(Error);
var NotImplementedError = (function (_super) {
    __extends(NotImplementedError, _super);
    function NotImplementedError() {
        _super.call(this, 'Not implemented.');
    }
    return NotImplementedError;
})(Error);
function readonly(target, key) {
    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        set: function (value) {
            Object.defineProperty(this, key, {
                configurable: false,
                enumerable: true,
                value: value
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
    var CustomStorageEntry = storageItem.isOfType(Windows.Storage.StorageItemTypes.file) ? StorageFileEntry : StorageDirectoryEntry;
    return new CustomStorageEntry(filesystem, storageItem);
}
var StorageEntry = (function () {
    function StorageEntry(filesystem, _storageItem) {
        this._storageItem = _storageItem;
        this.filesystem = filesystem;
    }
    Object.defineProperty(StorageEntry.prototype, "name", {
        get: function () {
            return this._storageItem.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StorageEntry.prototype, "fullPath", {
        get: function () {
            return this._storageItem.path;
        },
        enumerable: true,
        configurable: true
    });
    StorageEntry.prototype.getMetadata = function (onSuccess, onError) {
        this._storageItem.getBasicPropertiesAsync().done(function (props) { return onSuccess({ modificationTime: props.dateModified, size: props.size }); }, onError);
    };
    StorageEntry.prototype.moveTo = function (parent, newName, onSuccess, onError) {
        throw new NotImplementedError();
    };
    StorageEntry.prototype.copyTo = function (parent, newName, onSuccess, onError) {
        throw new NotImplementedError();
    };
    StorageEntry.prototype.toURL = function () {
        var fs = this.filesystem;
        return "ms-appdata:///" + fs.name + "/" + this._storageItem.path.slice(fs.root.fullPath.length + 1).replace(/\\/g, '/');
    };
    StorageEntry.prototype.remove = function (onSuccess, onError) {
        this._storageItem.deleteAsync().done(onSuccess, onError);
    };
    StorageEntry.prototype.getParent = function (onSuccess, onError) {
        var _this = this;
        this._storageItem.getParentAsync().done(function (parent) { return onSuccess(parent ? new StorageDirectoryEntry(_this.filesystem, parent) : _this.filesystem.root); }, onError);
    };
    __decorate([
        readonly
    ], StorageEntry.prototype, "isFile", void 0);
    __decorate([
        readonly
    ], StorageEntry.prototype, "isDirectory", void 0);
    __decorate([
        readonly
    ], StorageEntry.prototype, "filesystem", void 0);
    return StorageEntry;
})();
var StorageDirectoryEntry = (function (_super) {
    __extends(StorageDirectoryEntry, _super);
    function StorageDirectoryEntry() {
        _super.apply(this, arguments);
        this.isFile = false;
        this.isDirectory = true;
    }
    StorageDirectoryEntry.prototype.createReader = function () {
        return new StorageDirectoryReader(this.filesystem, this._storageItem);
    };
    StorageDirectoryEntry.prototype._getItem = function (createItemAsync, getItemAsync, path, options, onSuccess, onError) {
        var _this = this;
        var collisionOpt = Windows.Storage.CreationCollisionOption;
        (options.create
            ? createItemAsync.call(this._storageItem, path, options.exclusive ? collisionOpt.failIfExists : collisionOpt.openIfExists)
            : getItemAsync.call(this._storageItem, path)).done(function (storageItem) { return onSuccess(createStorageEntry(_this.filesystem, storageItem)); }, onError);
    };
    StorageDirectoryEntry.prototype.getFile = function (path, options, onSuccess, onError) {
        this._getItem(this._storageItem.createFileAsync, this._storageItem.getFileAsync, path, options, onSuccess, onError);
    };
    StorageDirectoryEntry.prototype.getDirectory = function (path, options, onSuccess, onError) {
        this._getItem(this._storageItem.createFolderAsync, this._storageItem.getFolderAsync, path, options, onSuccess, onError);
    };
    StorageDirectoryEntry.prototype.remove = function (onSuccess, onError) {
        var _this = this;
        this._storageItem.getItemsAsync(0, 1).then(function (_a) {
            var length = _a.length;
            if (length > 0) {
                onError && onError(new NoModificationAllowedError());
                return;
            }
            return _super.prototype.remove.call(_this, onSuccess, onError);
        });
    };
    StorageDirectoryEntry.prototype.removeRecursively = function (onSuccess, onError) {
        this.remove(onSuccess, onError);
    };
    return StorageDirectoryEntry;
})(StorageEntry);
var StorageDirectoryReader = (function () {
    function StorageDirectoryReader(_filesystem, _storageFolder) {
        this._filesystem = _filesystem;
        this._storageFolder = _storageFolder;
        this._read = false;
    }
    StorageDirectoryReader.prototype.readEntries = function (onSuccess, onError) {
        var _this = this;
        this._read = true;
        this._storageFolder.getItemsAsync().done(function (items) { return onSuccess(items.map(function (item) { return createStorageEntry(_this._filesystem, item); })); }, onError);
    };
    return StorageDirectoryReader;
})();
var StorageFileEntry = (function (_super) {
    __extends(StorageFileEntry, _super);
    function StorageFileEntry() {
        _super.apply(this, arguments);
        this.isFile = true;
        this.isDirectory = false;
    }
    StorageFileEntry.prototype.createWriter = function (onSuccess, onError) {
        this._storageItem.openAsync(Windows.Storage.FileAccessMode.readWrite)
            .then(function (stream) { return new StorageFileWriter(stream); })
            .done(onSuccess, onError);
    };
    StorageFileEntry.prototype.file = function (onSuccess, onError) {
        var _this = this;
        new WinJS.Promise(function (resolve) { return resolve(MSApp.createFileFromStorageFile(_this._storageItem)); })
            .done(onSuccess, onError);
    };
    StorageFileEntry.prototype.moveTo = function (parent, newName, onSuccess, onError) {
        var _this = this;
        this._storageItem.moveAsync(parent._storageItem, newName, Windows.Storage.NameCollisionOption.failIfExists).done(function () { return onSuccess(_this); }, onError);
    };
    StorageFileEntry.prototype.copyTo = function (parent, newName, onSuccess, onError) {
        var _this = this;
        this._storageItem.copyAsync(parent._storageItem, newName, Windows.Storage.NameCollisionOption.failIfExists).done(function () { return onSuccess(_this); }, onError);
    };
    return StorageFileEntry;
})(StorageEntry);
var StorageFileSystem = (function () {
    function StorageFileSystem(name, storageFolder) {
        this.name = name;
        this.root = new StorageDirectoryEntry(this, storageFolder);
    }
    __decorate([
        readonly
    ], StorageFileSystem.prototype, "name", void 0);
    __decorate([
        readonly
    ], StorageFileSystem.prototype, "root", void 0);
    return StorageFileSystem;
})();
;
var StorageFileWriter = (function (_super) {
    __extends(StorageFileWriter, _super);
    function StorageFileWriter(_stream) {
        _super.call(this);
        this._stream = _stream;
        this.INIT = 0 /* INIT */;
        this.WRITING = 1 /* WRITING */;
        this.DONE = 2 /* DONE */;
        this._readyState = 0 /* INIT */;
        this._error = null;
        this._writingProcess = null;
    }
    Object.defineProperty(StorageFileWriter.prototype, "readyState", {
        get: function () {
            return this._readyState;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StorageFileWriter.prototype, "error", {
        get: function () {
            return this._error;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StorageFileWriter.prototype, "position", {
        get: function () {
            return this._stream.position;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StorageFileWriter.prototype, "length", {
        get: function () {
            return this._stream.size;
        },
        enumerable: true,
        configurable: true
    });
    StorageFileWriter.prototype.abort = function () {
        if (this._readyState === 2 /* DONE */ || this._readyState === 0 /* INIT */) {
            return;
        }
        this._writingProcess.cancel();
        this._error = new AbortError();
        this._writeEnd('abort');
    };
    StorageFileWriter.prototype.seek = function (offset) {
        if (this._readyState === 1 /* WRITING */) {
            throw new InvalidStateError();
        }
        var length = this.length;
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
    };
    StorageFileWriter.prototype._writeStart = function () {
        if (this._readyState === 1 /* WRITING */) {
            throw new InvalidStateError();
        }
        this._readyState = 1 /* WRITING */;
        this._error = null;
        this.dispatchEvent(new ProgressEvent('writestart'));
    };
    StorageFileWriter.prototype._writeEnd = function (status) {
        this._readyState = 2 /* DONE */;
        this._writingProcess = null;
        this.dispatchEvent(new ProgressEvent(status));
        this.dispatchEvent(new ProgressEvent('writeend'));
    };
    StorageFileWriter.prototype._writeProgress = function (loaded, total) {
        this.dispatchEvent(new ProgressEvent('progress', {
            lengthComputable: true,
            loaded: loaded,
            total: total
        }));
    };
    StorageFileWriter.prototype._write = function (write) {
        var _this = this;
        this._writeStart();
        this._writingProcess = write(this._stream);
        this._writingProcess.done(function () { return _this._writeEnd('write'); }, function (err) {
            // TODO: check whether this is required
            if (_this._error instanceof AbortError) {
                return;
            }
            _this._error = err;
            _this._writeEnd('error');
        });
    };
    StorageFileWriter.prototype.truncate = function (newLength) {
        var _this = this;
        this._write(function (stream) {
            stream.size = newLength;
            return stream.flushAsync().then(function () {
                if (_this._stream.position > newLength) {
                    _this._stream.position = newLength;
                }
            });
        });
    };
    StorageFileWriter.prototype.write = function (data) {
        var _this = this;
        var size = data.size;
        this._write(function (stream) { return Windows.Storage.Streams.RandomAccessStream.copyAsync(data.msDetachStream(), stream).then(function () { return _this._writeProgress(size, size); }, null, function (written) { return _this._writeProgress(written, size); }); });
    };
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
    return StorageFileWriter;
})(ProgressEventTarget);
var TEMPORARY = 0;
var PERSISTENT = 1;
var appData = Windows.Storage.ApplicationData.current;
var fileSystemResolvers = [
    function () { return new StorageFileSystem('temp', appData.temporaryFolder); },
    function () { return new StorageFileSystem('local', appData.localFolder); }
].map(function (createFS, i, resolvers) { return function () {
    var fs = createFS();
    resolvers[i] = function () { return fs; };
    return fs;
}; });
var requestFileSystem = window.requestFileSystem =
    window.webkitRequestFileSystem =
        function requestFileSystem(type, size, onSuccess, onError) {
            onSuccess(fileSystemResolvers[type]());
        };
var resolveLocalFileSystemURL = window.resolveLocalFileSystemURL =
    function resolveLocalFileSystemURL(url, onSuccess, onError) {
        var match = url.match(/^ms-appdata:\/{3}(local|temp)\//);
        if (!match) {
            onError && onError(new SecurityError());
            return;
        }
        var type = match[1] === 'local' ? PERSISTENT : TEMPORARY;
        Windows.Storage.StorageFile.getFileFromApplicationUriAsync(new Windows.Foundation.Uri(url))
            .done(function (file) { return new StorageFileEntry(fileSystemResolvers[type](), file); }, onError);
    };
