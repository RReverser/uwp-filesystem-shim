import { async } from './async';
import { NoModificationAllowedError } from './errors';
import { StorageEntry, createStorageEntry } from './StorageEntry';
import { StorageDirectoryReader } from './StorageDirectoryReader';
import { StorageFolder } from './winTypes';

const { CreationCollisionOption, NameCollisionOption } = Windows.Storage;

async function ensureEmpty(folder: StorageFolder) {
    let { length } = await folder.getItemsAsync(0, 1);
    if (length > 0) {
        throw new NoModificationAllowedError();
    }
    return folder;
}

export class StorageDirectoryEntry extends StorageEntry implements DirectoryEntry {
    _storageItem: StorageFolder;
    isFile = false;
    isDirectory = true;

    createReader() {
        return new StorageDirectoryReader(this.filesystem, this._storageItem);
    }

    @async
    private async _getItem<I extends Windows.Storage.IStorageItem>(
        createItemAsync: (desiredName: string, options?: Windows.Storage.CreationCollisionOption) => PromiseLike<I>,
        getItemAsync: (name: string) => PromiseLike<I>,
        path: string,
        options?: Flags,
        onSuccess?: EntryCallback,
        onError?: ErrorCallback
    ) {
        let storageFolder = this._storageItem;
        if (path[0] === '/') {
            storageFolder = this.filesystem.root._storageItem;
            path = path.slice(1);
        }
        let storageItem: I;
        if (options && options.create) {
            storageItem = await createItemAsync.call(storageFolder, path, options.exclusive ? CreationCollisionOption.failIfExists : CreationCollisionOption.openIfExists);
        } else {
            storageItem = await getItemAsync.call(storageFolder, path);
        }
        return createStorageEntry(this.filesystem, storageItem);
    }

    getFile(path: string, options?: Flags, onSuccess?: FileEntryCallback, onError?: ErrorCallback) {
        return this._getItem(
            this._storageItem.createFileAsync,
            this._storageItem.getFileAsync,
            path,
            options,
            onSuccess,
            onError
        );
    }

    getDirectory(path: string, options?: Flags, onSuccess?: DirectoryEntryCallback, onError?: ErrorCallback) {
        return this._getItem(
            this._storageItem.createFolderAsync,
            this._storageItem.getFolderAsync,
            path,
            options,
            onSuccess,
            onError
        );
    }

    protected async _remove() {
        await ensureEmpty(this._storageItem);
        await super._remove();
    }

    removeRecursively(onSuccess: VoidCallback, onError?: ErrorCallback) {
        super._remove().then(onSuccess, onError);
    }

    private async _sync(
        onFile: (file: StorageFile, dest: StorageFolder) => Windows.Foundation.IPromise<any>,
        onFolder: (folder: StorageFolder, dest: StorageFolder) => Windows.Foundation.IPromise<any>,
        folder: StorageFolder,
        parent: StorageFolder,
        name: string = folder.name
    ) {
        let dest: StorageFolder;
        let files: Windows.Foundation.Collections.IVectorView<StorageFile>;
        let folders: Windows.Foundation.Collections.IVectorView<StorageFolder>;
        [ dest, files, folders ] = await Promise.all([
            Promise.resolve(parent.createFolderAsync(name, CreationCollisionOption.openIfExists)).then(ensureEmpty),
            folder.getFilesAsync(),
            folder.getFoldersAsync()
        ]);
        await Promise.all([
            files.map(file => onFile(file, dest)),
            folders.map(folder => onFolder(folder, dest))
        ]);
    }

    moveTo(parent: StorageDirectoryEntry, newName?: string, onSuccess?: EntryCallback, onError?: ErrorCallback) {
        this._moveTo(this._storageItem, parent._storageItem, newName)
        .then(() => this)
        .done(onSuccess, onError);
    }

    copyTo(parent: StorageDirectoryEntry, newName?: string, onSuccess?: EntryCallback, onError: ErrorCallback = noop) {
        this._copyTo(this._storageItem, parent._storageItem, newName)
        .then(() => this)
        .done(onSuccess, onError);
    }

    _moveTo(folder: StorageFolder, parent: StorageFolder, newName?: string): WinJS.IPromise<void> {
        return this._sync(
            (file, dest) => file.moveAsync(dest, file.name, NameCollisionOption.replaceExisting).then(() => {}),
            (folder, dest) => this._moveTo(folder, dest),
            folder,
            parent,
            newName
        );
    }

    _copyTo(folder: StorageFolder, parent: StorageFolder, newName?: string): WinJS.IPromise<void> {
        return this._sync(
            (file, dest) => file.copyAsync(dest, file.name, NameCollisionOption.replaceExisting),
            (folder, dest) => this._copyTo(folder, dest),
            folder,
            parent,
            newName
        );
    }
}
