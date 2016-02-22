import { StorageEntry } from './StorageEntry';
import { StorageFileWriter } from './StorageFileWriter';
import { StorageDirectoryEntry } from './StorageDirectoryEntry';
import { StorageFile, StorageFolder } from './winTypes';
import { async } from './async';

export class StorageFileEntry extends StorageEntry<StorageFile> implements FileEntry {
    isFile = true;
    isDirectory = false;

    @async
    async createWriter(): Promise<FileWriter> {
        let props = await this._storageItem.getBasicPropertiesAsync();
        return new StorageFileWriter(this._storageItem, props.size);
    }

    @async
    file(): File {
        return MSApp.createFileFromStorageFile(this._storageItem);
    }

    protected _moveTo(parent: StorageFolder, newName: string) {
        return this._storageItem.moveAsync(parent, newName, Windows.Storage.NameCollisionOption.failIfExists);
    }

    protected _copyTo(parent: StorageFolder, newName: string) {
        return this._storageItem.copyAsync(parent, newName, Windows.Storage.NameCollisionOption.failIfExists);
    }
}
