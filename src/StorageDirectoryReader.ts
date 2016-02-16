class StorageDirectoryReader implements DirectoryReader {
    private _read = false;
    
    constructor(private _filesystem: StorageFileSystem, private _storageFolder: Windows.Storage.StorageFolder) {}
    
    readEntries(onSuccess: EntriesCallback, onError?: ErrorCallback) {
        this._read = true;
        this._storageFolder.getItemsAsync().done(
            items => onSuccess(items.map(item => createStorageEntry(this._filesystem, item))),
            onError
        );
    }
}