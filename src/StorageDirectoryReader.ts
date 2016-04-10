import { StorageFileSystem } from './StorageFileSystem';
import { createStorageEntry } from './StorageEntry';
import { StorageFolder, IStorageItem } from './winTypes';
import { async } from './async';

export class StorageDirectoryReader implements DirectoryReader {
    private _read = false;

    constructor(private _filesystem: StorageFileSystem, private _storageFolder: StorageFolder) {}

    @async
    async readEntries(): Promise<Entry[]> {
        this._read = true;
        let items = await this._storageFolder.getItemsAsync();
        return items.map(item => createStorageEntry(this._filesystem, item));
    }
}
