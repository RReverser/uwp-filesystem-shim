import { StorageFileSystem } from './StorageFileSystem';
import { StorageFileEntry } from './StorageFileEntry';
import { wrapAsync } from './async';
import { StorageFolder } from './winTypes';

const { Uri } = Windows.Foundation;
const { StorageFile, ApplicationData: { current: appData } } = Windows.Storage;

export const enum FileSystemType {
    TEMPORARY,
    PERSISTENT
} 

const fsCache: StorageFileSystem[] = [undefined, undefined];

function getFileSystem(type: FileSystemType) {
    let fs = fsCache[type];
    if (!fs) {
        switch (type) {
            case FileSystemType.TEMPORARY:
                fs = new StorageFileSystem('temp', appData.temporaryFolder);
                break;
            case FileSystemType.PERSISTENT:
                fs = new StorageFileSystem('local', appData.localFolder);
                break;
        }
        fsCache[type] = fs;
    }
    return fs;
}

export const requestFileSystem: typeof window.requestFileSystem = wrapAsync((type: FileSystemType, size: number) => {
    return getFileSystem(type);
});

export const resolveLocalFileSystemURL: typeof window.resolveLocalFileSystemURL = wrapAsync(async (url: string) => {
    let match = url.match(/^ms-appdata:\/{3}(local|temp)\//);
    if (!match) {
        throw new Error('SecurityError');
    }
    return new StorageFileEntry(
        getFileSystem(match[1] === 'local' ? FileSystemType.PERSISTENT : FileSystemType.TEMPORARY),
        await StorageFile.getFileFromApplicationUriAsync(new Uri(url))
    );
});
