const TEMPORARY = 0;
const PERSISTENT = 1;

const appData = Windows.Storage.ApplicationData.current;

const fileSystemResolvers = [
    () => new StorageFileSystem('temp', appData.temporaryFolder),
    () => new StorageFileSystem('local', appData.localFolder)
].map((createFS, i, resolvers) => () => {
    let fs = createFS();
    resolvers[i] = () => fs;
    return fs;
});

var requestFileSystem =
    window.requestFileSystem =
    window.webkitRequestFileSystem =
    function requestFileSystem(type, size, onSuccess, onError?) {
        onSuccess(fileSystemResolvers[type]());
    };

var resolveLocalFileSystemURL =
    window.resolveLocalFileSystemURL = 
    function resolveLocalFileSystemURL(url, onSuccess, onError?) {
        let match = url.match(/^ms-appdata:\/{3}(local|temp)\//);
        if (!match) {
            onError && onError(new SecurityError());
            return;
        }
        let type = match[1] === 'local' ? PERSISTENT : TEMPORARY;
        Windows.Storage.StorageFile.getFileFromApplicationUriAsync(new Windows.Foundation.Uri(url))
        .done(file => new StorageFileEntry(fileSystemResolvers[type](), file), onError);
    };