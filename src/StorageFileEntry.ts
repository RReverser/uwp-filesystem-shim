class StorageFileEntry extends StorageEntry implements FileEntry {
    public _storageItem: Windows.Storage.IStorageFile;
    
    createWriter(onSuccess: FileWriterCallback, onError?: ErrorCallback) {
        this._storageItem.openAsync(Windows.Storage.FileAccessMode.readWrite)
        .then(stream => new StorageFileWriter(stream))
        .done(onSuccess, onError);
    }
    
    file(onSuccess: FileCallback, onError?: ErrorCallback) {
        new WinJS.Promise(resolve => resolve(MSApp.createFileFromStorageFile(this._storageItem)))
        .done(onSuccess, onError);
    }
    
    moveTo(parent: StorageDirectoryEntry, newName?: string, onSuccess?: EntryCallback, onError?: ErrorCallback) {
        this._storageItem.moveAsync(parent._storageItem, newName, Windows.Storage.NameCollisionOption.failIfExists).done(
            () => onSuccess(this),
            onError
        );
    }
    
    copyTo(parent: StorageDirectoryEntry, newName?: string, onSuccess?: EntryCallback, onError?: ErrorCallback) {
        this._storageItem.copyAsync(parent._storageItem, newName, Windows.Storage.NameCollisionOption.failIfExists).done(
            () => onSuccess(this),
            onError
        );
    }
}