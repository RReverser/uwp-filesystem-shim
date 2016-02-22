import { StorageDirectoryEntry } from './StorageDirectoryEntry';
import { readonly } from './readonly';
import { StorageFolder } from './winTypes';

export class StorageFileSystem implements FileSystem {
    @readonly name: string;
    @readonly root: StorageDirectoryEntry;

    constructor(name: string, storageFolder: StorageFolder) {
        this.name = name;
        this.root = new StorageDirectoryEntry(this, storageFolder);
    }
}
