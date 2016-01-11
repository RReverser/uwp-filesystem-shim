class StorageFileSystem implements FileSystem {
    root: StorageDirectoryEntry;
    
    constructor(public name: string, storageFolder: Windows.Storage.IStorageFolder) {
        this.root = new StorageDirectoryEntry(this, storageFolder);
    }
}