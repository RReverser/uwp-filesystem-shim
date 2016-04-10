import { async } from './async';
import { StorageEntry, createStorageEntry } from './StorageEntry';
import { StorageDirectoryReader } from './StorageDirectoryReader';
import { StorageFolder, StorageFile, IStorageItem } from './winTypes';

const { CreationCollisionOption, NameCollisionOption } = Windows.Storage;
type IVectorView<T> = Windows.Foundation.Collections.IVectorView<T>;

async function ensureEmpty(folder: StorageFolder) {
    let { length } = await folder.getItemsAsync(0, 1);
    if (length > 0) {
        throw new Error('NoModificationAllowedError');
    }
    return folder;
}

async function sync(
    onFile: (dest: Windows.Storage.IStorageFolder, newName: string, option: Windows.Storage.NameCollisionOption) => PromiseLike<any>,
    folder: StorageFolder,
    parent: StorageFolder,
    newName: string = folder.name
) {
    let dest: StorageFolder;
    let files: IVectorView<StorageFile>;
    let folders: IVectorView<StorageFolder>;
    [ dest, files, folders ] = await Promise.all([
        Promise.resolve(parent.createFolderAsync(newName, CreationCollisionOption.openIfExists)).then(ensureEmpty),
        folder.getFilesAsync(),
        folder.getFoldersAsync()
    ]);
    await Promise.all([
        files.map(file => onFile.call(file, dest, file.name, NameCollisionOption.replaceExisting)),
        folders.map(folder => sync(onFile, folder, dest))
    ]);
}

export class StorageDirectoryEntry extends StorageEntry<StorageFolder> implements DirectoryEntry {
    isFile = false;
    isDirectory = true;

    createReader() {
        return new StorageDirectoryReader(this.filesystem, this._storageItem);
    }

    @async
    private async _getItem<I extends IStorageItem>(
        createItemAsync: (desiredName: string, options?: Windows.Storage.CreationCollisionOption) => PromiseLike<I>,
        getItemAsync: (name: string) => PromiseLike<I>,
        path: string,
        options?: Flags,
        onSuccess?: EntryCallback,
        onError?: ErrorCallback
    ): Promise<Entry> {
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

    @async
    removeRecursively(): Promise<void> {
        return super._remove();
    }

    protected async _moveTo(parent: StorageFolder, newName?: string) {
        await sync(
            StorageFile.prototype.moveAsync,
            this._storageItem,
            parent,
            newName
        );
        await this.removeRecursively();
    }

    protected _copyTo(parent: StorageFolder, newName?: string) {
        return sync(
            StorageFile.prototype.copyAsync,
            this._storageItem,
            parent,
            newName
        );
    }
}
