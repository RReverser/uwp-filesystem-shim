function ensureEmpty(folder: Windows.Storage.StorageFolder) {
    return folder.getItemsAsync(0, 1).then(({ length }) => {
        if (length > 0) {
            throw new NoModificationAllowedError();
        }
    });
}

class StorageDirectoryEntry extends StorageEntry implements DirectoryEntry {
    _storageItem: Windows.Storage.StorageFolder;
    isFile = false;
    isDirectory = true;

    createReader() {
        return new StorageDirectoryReader(this.filesystem, this._storageItem);
    }

    private _getItem<T extends Windows.Storage.IStorageItem>(
        createItemAsync: (desiredName: string, options: Windows.Storage.CreationCollisionOption) => Windows.Foundation.IAsyncOperation<T>,
        getItemAsync: (name: string) => Windows.Foundation.IAsyncOperation<T>,
        path: string,
        options?: Flags,
        onSuccess?: EntryCallback,
        onError: ErrorCallback = noop
    ) {
        let storageFolder = this._storageItem;
        if (path[0] === '/') {
            storageFolder = this.filesystem.root._storageItem;
            path = path.slice(1);
        }
        let collisionOpt = Windows.Storage.CreationCollisionOption;
        (
            options && options.create
            ? createItemAsync.call(storageFolder, path, options && options.exclusive ? collisionOpt.failIfExists : collisionOpt.openIfExists)
            : getItemAsync.call(storageFolder, path)
        ).done(
            (storageItem: T) => onSuccess(createStorageEntry(this.filesystem, storageItem)),
            onError
        );
    }

    getFile(path: string, options?: Flags, onSuccess?: FileEntryCallback, onError?: ErrorCallback) {
        this._getItem(
            this._storageItem.createFileAsync,
            this._storageItem.getFileAsync,
            path,
            options,
            onSuccess,
            onError
        );
    }

    getDirectory(path: string, options?: Flags, onSuccess?: DirectoryEntryCallback, onError?: ErrorCallback) {
        this._getItem(
            this._storageItem.createFolderAsync,
            this._storageItem.getFolderAsync,
            path,
            options,
            onSuccess,
            onError
        );
    }

    remove(onSuccess: VoidCallback, onError: ErrorCallback = noop) {
        ensureEmpty(this._storageItem).done(() => super.remove(onSuccess, onError), onError);
    }

    removeRecursively(onSuccess: VoidCallback, onError: ErrorCallback = noop) {
        super.remove(onSuccess, onError);
    }

    private _sync(
        onFile: (file: Windows.Storage.StorageFile, dest: Windows.Storage.StorageFolder) => Windows.Foundation.IPromise<any>,
        onFolder: (folder: Windows.Storage.StorageFolder, dest: Windows.Storage.StorageFolder) => Windows.Foundation.IPromise<any>,
        folder: Windows.Storage.StorageFolder,
        parent: Windows.Storage.StorageFolder,
        name: string = folder.name
    ) {
        return WinJS.Promise.join({
            dest: parent.createFolderAsync(name, Windows.Storage.CreationCollisionOption.openIfExists).then(ensureEmpty),
            files: folder.getFilesAsync(),
            folders: folder.getFoldersAsync()
        }).then(({ dest, files, folders }: {
            dest: Windows.Storage.StorageFolder,
            files: Windows.Foundation.Collections.IVectorView<Windows.Storage.StorageFile>,
            folders: Windows.Foundation.Collections.IVectorView<Windows.Storage.StorageFolder>
        }) => WinJS.Promise.join({
            files: files.map(file => onFile(file, dest)),
            folders: folders.map(folder => onFolder(folder, dest))
        }));
    }

    moveTo(parent: StorageDirectoryEntry, newName?: string, onSuccess?: EntryCallback, onError: ErrorCallback = noop) {
        this._moveTo(this._storageItem, parent._storageItem, newName)
        .then(() => this)
        .done(onSuccess, onError);
    }

    copyTo(parent: StorageDirectoryEntry, newName?: string, onSuccess?: EntryCallback, onError: ErrorCallback = noop) {
        this._copyTo(this._storageItem, parent._storageItem, newName)
        .then(() => this)
        .done(onSuccess, onError);
    }

    _moveTo(folder: Windows.Storage.StorageFolder, parent: Windows.Storage.StorageFolder, newName?: string): WinJS.IPromise<void> {
        return this._sync(
            (file, dest) => file.moveAsync(dest, file.name, Windows.Storage.NameCollisionOption.replaceExisting).then(() => {}),
            (folder, dest) => this._moveTo(folder, dest),
            folder,
            parent,
            newName
        );
    }

    _copyTo(folder: Windows.Storage.StorageFolder, parent: Windows.Storage.StorageFolder, newName?: string): WinJS.IPromise<void> {
        return this._sync(
            (file, dest) => file.copyAsync(dest, file.name, Windows.Storage.NameCollisionOption.replaceExisting),
            (folder, dest) => this._copyTo(folder, dest),
            folder,
            parent,
            newName
        );
    }
}
