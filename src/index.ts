import { SecurityError } from './errors';
import { StorageFileSystem } from './StorageFileSystem';
import { StorageFileEntry } from './StorageFileEntry';
import { wrapAsync } from './async';

const { Uri } = Windows.Foundation;
const { StorageFile, ApplicationData: { current: appData } } = Windows.Storage;

export const enum FileSystemType {
    TEMPORARY,
    PERSISTENT
}

const fileSystemResolvers = [
    () => new StorageFileSystem('temp', appData.temporaryFolder),
    () => new StorageFileSystem('local', appData.localFolder)
].map((createFS, i, resolvers) => () => {
    let fs = createFS();
    resolvers[i] = () => fs;
    return fs;
});

export const requestFileSystem: typeof window.requestFileSystem = wrapAsync((type: FileSystemType, size: number) => {
    return fileSystemResolvers[type]();
});

export const resolveLocalFileSystemURL: typeof window.resolveLocalFileSystemURL = wrapAsync(async (url: string) => {
    let match = url.match(/^ms-appdata:\/{3}(local|temp)\//);
    if (!match) {
        throw new SecurityError();
    }
    let type = match[1] === 'local' ? FileSystemType.PERSISTENT : FileSystemType.TEMPORARY;
    let file = await StorageFile.getFileFromApplicationUriAsync(new Uri(url));
    return new StorageFileEntry(fileSystemResolvers[type](), file);
});
