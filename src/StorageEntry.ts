import { NoModificationAllowedError } from './errors';
import { StorageFileSystem } from './StorageFileSystem';
import { StorageFileEntry } from './StorageFileEntry';
import { StorageDirectoryEntry } from './StorageDirectoryEntry';
import { StorageFile, StorageFolder, IStorageItem } from './winTypes';
import { readonly } from './readonly';
import './winTypes';

export function createStorageEntry(filesystem: StorageFileSystem, storageItem: IStorageItem): StorageEntry {
    let CustomStorageEntry = storageItem.isOfType(Windows.Storage.StorageItemTypes.file) ? StorageFileEntry : StorageDirectoryEntry;
    return new CustomStorageEntry(filesystem, storageItem);
}

export abstract class StorageEntry implements Entry {
    @readonly isFile: boolean;
    @readonly isDirectory: boolean;

    get name() {
        return this._storageItem.name;
    }

    get fullPath() {
        return this._storageItem.path.slice(this.filesystem.root._storageItem.path.length).replace(/\\/g, '/');
    }

    @readonly filesystem: StorageFileSystem;

    constructor(filesystem: StorageFileSystem, public _storageItem: IStorageItem) {
        this.filesystem = filesystem;
    }

    getMetadata(onSuccess: MetadataCallback, onError?: ErrorCallback) {
        this._storageItem.getBasicPropertiesAsync().done(
            props => onSuccess({ modificationTime: props.dateModified, size: props.size }),
            onError
        );
    }

    abstract moveTo(parent: StorageDirectoryEntry, newName?: string, onSuccess?: EntryCallback, onError?: ErrorCallback): void;

    abstract copyTo(parent: StorageDirectoryEntry, newName?: string, onSuccess?: EntryCallback, onError?: ErrorCallback): void;

    toURL() {
        return 'ms-appdata:///' + this.filesystem.name + this.fullPath;
    }

    protected async _remove() {
        if (this._storageItem.path === this.filesystem.root._storageItem.path) {
            throw new NoModificationAllowedError();
        }
        await this._storageItem.deleteAsync();
    }

    remove(onSuccess: VoidCallback, onError?: ErrorCallback) {
        this._remove().then(onSuccess, onError);
    }

    getParent(onSuccess: DirectoryEntryCallback, onError?: ErrorCallback) {
        this._storageItem.getParentAsync().done(
            parent => onSuccess(parent ? new StorageDirectoryEntry(this.filesystem, parent) : this.filesystem.root),
            onError
        );
    }
}
