const TEMPORARY = 0;
const PERSISTENT = 1;

const appData = Windows.Storage.ApplicationData.current;

const fileSystems = [
    new StorageFileSystem('temp', appData.temporaryFolder),
    new StorageFileSystem('local', appData.localFolder)
];

var requestFileSystem: typeof window.requestFileSystem = function requestFileSystem(type, size, onSuccess, onError?) {
    onSuccess(fileSystems[type]);
};

var resolveLocalFileSystemURL: typeof window.resolveLocalFileSystemURL = function resolveLocalFileSystemURL(url, onSuccess, onError?) {
    let match = url.match(/^ms-appdata:\/{3}(local|temp)\//);
    if (!match) {
        onError(new SecurityError());
    }
    Windows.Storage.StorageFile.getFileFromApplicationUriAsync(new Windows.Foundation.Uri(url))
    .done(file => new StorageFileEntry(fileSystems[match[1] === 'local' ? 1 : 0], file), onError);
};