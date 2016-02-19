import { StorageEntry } from './StorageEntry';
import { StorageFileWriter } from './StorageFileWriter';
import { StorageDirectoryEntry } from './StorageDirectoryEntry';

export class StorageFileEntry extends StorageEntry implements FileEntry {
    _storageItem: Windows.Storage.StorageFile;
    isFile = true;
    isDirectory = false;

    createWriter(onSuccess: FileWriterCallback, onError?: ErrorCallback) {
        this._storageItem.getBasicPropertiesAsync()
        .then(props => new StorageFileWriter(this._storageItem, props.size))
        .done(onSuccess, onError);
    }

    file(onSuccess: FileCallback, onError?: ErrorCallback) {
        Promise.resolve()
        .then(() => MSApp.createFileFromStorageFile(this._storageItem))
        .then(onSuccess, onError);
    }

    moveTo(parent: StorageDirectoryEntry, newName: string = this.name, onSuccess?: EntryCallback, onError?: ErrorCallback) {
        this._storageItem.moveAsync(parent._storageItem, newName, Windows.Storage.NameCollisionOption.failIfExists)
        .then(() => this)
        .then(onSuccess, onError);
    }

    copyTo(parent: StorageDirectoryEntry, newName: string = this.name, onSuccess?: EntryCallback, onError?: ErrorCallback) {
        this._storageItem.copyAsync(parent._storageItem, newName, Windows.Storage.NameCollisionOption.failIfExists)
        .then(() => this)
        .then(onSuccess, onError);
    }
}
