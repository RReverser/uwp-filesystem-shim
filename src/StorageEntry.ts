import { StorageFileSystem } from './StorageFileSystem';
import { StorageFileEntry } from './StorageFileEntry';
import { StorageDirectoryEntry } from './StorageDirectoryEntry';
import { StorageFolder, StorageFile, IStorageItem } from './winTypes';
import { readonly } from './readonly';
import { async, Awaitable } from './async';

function isFolder(storageItem: IStorageItem): storageItem is StorageFolder {
    return storageItem.isOfType(Windows.Storage.StorageItemTypes.folder);
}

function isFile(storageItem: IStorageItem): storageItem is StorageFile {
    return storageItem.isOfType(Windows.Storage.StorageItemTypes.file);
}

export function createStorageEntry(filesystem: StorageFileSystem, storageItem: IStorageItem): StorageEntry<IStorageItem> {
    if (isFolder(storageItem)) {
        return new StorageDirectoryEntry(filesystem, storageItem);
    }
    if (isFile(storageItem)) {
        return new StorageFileEntry(filesystem, storageItem);
    }
}

export abstract class StorageEntry<T extends IStorageItem> implements Entry {
    @readonly isFile: boolean;
    @readonly isDirectory: boolean;

    get name() {
        return this._storageItem.name;
    }

    get fullPath() {
        return this._storageItem.path.slice(this.filesystem.root._storageItem.path.length).replace(/\\/g, '/');
    }

    @readonly filesystem: StorageFileSystem;

    constructor(filesystem: StorageFileSystem, public _storageItem: T) {
        this.filesystem = filesystem;
    }

    @async
    async getMetadata(): Promise<Metadata> {
        let props = await this._storageItem.getBasicPropertiesAsync();
        return {
            modificationTime: props.dateModified,
            size: props.size
        };
    }

    protected abstract _moveTo(parent: StorageFolder, newName: string): Awaitable<any>;

    protected abstract _copyTo(parent: StorageFolder, newName: string): Awaitable<any>;

    @async
    async moveTo(parent: StorageDirectoryEntry, newName: string = this._storageItem.name): Promise<IStorageItem> {
        await this._moveTo(parent._storageItem, newName);
        return this._storageItem;
    }

    @async
    async copyTo(parent: StorageDirectoryEntry, newName: string = this._storageItem.name): Promise<IStorageItem> {
        await this._copyTo(parent._storageItem, newName);
        return this._storageItem;
    }

    toURL() {
        return 'ms-appdata:///' + this.filesystem.name + this.fullPath;
    }

    protected async _remove() {
        if (this._storageItem.path === this.filesystem.root._storageItem.path) {
            throw new Error('NoModificationAllowedError');
        }
        await this._storageItem.deleteAsync();
    }

    @async
    remove(): Promise<void> {
        return this._remove();
    }

    @async
    async getParent(): Promise<DirectoryEntry> {
        let parent = await this._storageItem.getParentAsync();
        return parent ? new StorageDirectoryEntry(this.filesystem, parent) : this.filesystem.root;
    }
}
