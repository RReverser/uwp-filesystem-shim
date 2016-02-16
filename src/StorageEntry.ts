namespace Windows.Storage {
    export interface IStorageItem2 extends IStorageItem {
        getParentAsync(): Windows.Foundation.IAsyncOperation<StorageFolder>;
    }
}

function createStorageEntry(filesystem: StorageFileSystem, storageItem: Windows.Storage.IStorageItem): StorageEntry {
    let CustomStorageEntry = storageItem.isOfType(Windows.Storage.StorageItemTypes.file) ? StorageFileEntry : StorageDirectoryEntry;
    return new CustomStorageEntry(filesystem, storageItem);
}

class StorageEntry implements Entry {
    @readonly isFile: boolean;
    @readonly isDirectory: boolean;

    get name() {
        return this._storageItem.name;
    }

    get fullPath() {
        return this._storageItem.path.slice(this.filesystem.root._storageItem.path.length).replace(/\\/g, '/');
    }

    @readonly filesystem: StorageFileSystem;

    constructor(filesystem: StorageFileSystem, public _storageItem: Windows.Storage.IStorageItem) {
        this.filesystem = filesystem;
    }

    getMetadata(onSuccess: MetadataCallback, onError?: ErrorCallback) {
        this._storageItem.getBasicPropertiesAsync().done(
            props => onSuccess({ modificationTime: props.dateModified, size: props.size }),
            onError
        );
    }

    moveTo(parent: StorageDirectoryEntry, newName?: string, onSuccess?: EntryCallback, onError?: ErrorCallback) {
        throw new NotImplementedError();
    }

    copyTo(parent: StorageDirectoryEntry, newName?: string, onSuccess?: EntryCallback, onError?: ErrorCallback) {
        throw new NotImplementedError();
    }

    toURL() {
        return 'ms-appdata:///' + this.filesystem.name + this.fullPath;
    }

    remove(onSuccess: VoidCallback, onError?: ErrorCallback) {
        /*
        if (this._storageItem.path === this.filesystem.root._storageItem.path) {
            throw new NoModificationAllowedError();
        }
        */
        this._storageItem.deleteAsync().done(onSuccess, onError);
    }

    getParent(onSuccess: DirectoryEntryCallback, onError?: ErrorCallback) {
        (<Windows.Storage.IStorageItem2>this._storageItem).getParentAsync().done(
            parent => onSuccess(parent ? new StorageDirectoryEntry(this.filesystem, parent) : this.filesystem.root),
            onError
        );
    }
}
