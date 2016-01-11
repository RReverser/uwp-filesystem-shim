class StorageDirectoryEntry extends StorageEntry implements DirectoryEntry {
    public _storageItem: Windows.Storage.IStorageFolder;
    
    createReader() {
        return new StorageDirectoryReader(this._filesystem, this._storageItem);
    }
    
    private _getItem<T extends Windows.Storage.IStorageItem>(
        createItemAsync: (desiredName: string, options: Windows.Storage.CreationCollisionOption) => Windows.Foundation.IAsyncOperation<T>,
        getItemAsync: (name: string) => Windows.Foundation.IAsyncOperation<T>,
        path: string,
        options?: Flags,
        onSuccess?: EntryCallback,
        onError?: ErrorCallback
    ) {
        let collisionOpt = Windows.Storage.CreationCollisionOption;
        (
            options.create
            ? createItemAsync.call(this._storageItem, path, options.exclusive ? collisionOpt.failIfExists : collisionOpt.openIfExists)
            : getItemAsync.call(this._storageItem, path)
        ).done(
            (storageItem: T) => onSuccess(StorageEntry.from(this._filesystem, storageItem)),
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
    
    remove(onSuccess: VoidCallback, onError?: ErrorCallback) {
        this._storageItem.getItemsAsync(0, 1).then(({ length }) => {
            if (length > 0) {
                onError && onError(new NoModificationAllowedError());
                return;
            }
            return super.remove(onSuccess, onError);
        });
    }
    
    removeRecursively(onSuccess: VoidCallback, onError?: ErrorCallback) {
        this.remove(onSuccess, onError);
    }
}