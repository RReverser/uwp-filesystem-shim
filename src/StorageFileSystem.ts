import { StorageDirectoryEntry } from './StorageDirectoryEntry';
import { readonly } from './readonly';

export class StorageFileSystem implements FileSystem {
    @readonly name: string;
    @readonly root: StorageDirectoryEntry;

    constructor(name: string, storageFolder: Windows.Storage.IStorageFolder) {
        this.name = name;
        this.root = new StorageDirectoryEntry(this, storageFolder);
    }
}
