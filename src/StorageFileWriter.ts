const enum ReadyState {
    INIT,
    WRITING,
    DONE
};

class StorageFileWriter extends ProgressEventTarget implements FileWriter {
    @readonly static INIT = ReadyState.INIT;
    @readonly static WRITING = ReadyState.WRITING;
    @readonly static DONE = ReadyState.DONE;
    
    @readonly INIT = ReadyState.INIT;
    @readonly WRITING = ReadyState.WRITING;
    @readonly DONE = ReadyState.DONE;

    private _readyState: number = ReadyState.INIT;
    private _error: DOMError = null;
    private _writingProcess: Windows.Foundation.IPromise<any> = null;
    private _position: number = 0;
    
    @progressEvent onwritestart: ProgressEventHandler;
    @progressEvent onprogress: ProgressEventHandler;
    @progressEvent onwrite: ProgressEventHandler;
    @progressEvent onabort: ProgressEventHandler;
    @progressEvent onerror: ProgressEventHandler;
    @progressEvent onwriteend: ProgressEventHandler;

    get readyState() {
        return this._readyState;
    }
    
    get error() {
        return this._error;
    }

    get position() {
        return this._position;
    }

    get length() {
        return this._length;
    }

    constructor(private _file: Windows.Storage.StorageFile, private _length: number) {
        super();
    }

    abort() {
        if (this._readyState === ReadyState.DONE || this._readyState === ReadyState.INIT) {
            return;
        }
        this._writingProcess.cancel();
        this._error = new AbortError();
        this._writeEnd('abort');
    }

    seek(offset: number) {
        if (this._readyState === ReadyState.WRITING) {
            throw new InvalidStateError();
        }
        let { length } = this;
        if (offset > length) {
            offset = length;
        }
        if (offset < 0) {
            offset += length;
        }
        if (offset < 0) {
            offset = 0;
        }
        this._position = offset;
    }

    private _writeStart() {
        if (this._readyState === ReadyState.WRITING) {
            throw new InvalidStateError();
        }
        this._readyState = ReadyState.WRITING;
        this._error = null;
        this.dispatchEvent(new ProgressEvent('writestart'));
        return this._file.openAsync(Windows.Storage.FileAccessMode.readWrite);
    }

    private _writeEnd(status: string): void {
        this._readyState = ReadyState.DONE;
        this._writingProcess = null;
        this.dispatchEvent(new ProgressEvent(status));
        this.dispatchEvent(new ProgressEvent('writeend'));
    }
    
    private _writeProgress(loaded: number, total: number) {
        this.dispatchEvent(new ProgressEvent('progress', {
            lengthComputable: true,
            loaded,
            total
        }));
    }

    private _write(write: (stream: Windows.Storage.Streams.IRandomAccessStream) => void) {
        this._writeStart();
        this._writingProcess = this._writeStart().then(stream => {
            let position = this._position;
            let length = this._length = stream.size;
            if (position > length) {
                position = this._position = length;
            }
            stream.seek(position);
            return (
                WinJS.Promise.wrap(stream)
                .then(write)
                .then(() => stream.flushAsync())
                .then(() => {}, err => err)
                .then(err => {
                    this._length = stream.size;
                    this._position = Math.min(stream.position, this._length);
                    stream.close();
                    return err && WinJS.Promise.wrapError(err);
                })
            );
        });
        this._writingProcess.done(
            () => this._writeEnd('write'),
            err => {
                // TODO: check whether this is required
                if (this._error instanceof AbortError) {
                    return;
                }
                this._error = err;
                this._writeEnd('error');
            }
        );
    }

    truncate(newLength: number) {
        this._write(stream => {
            stream.size = newLength;
        });
    }

    write(data: Blob) {
        let { size } = data;
        this._write(stream => Windows.Storage.Streams.RandomAccessStream.copyAsync(data.msDetachStream(), stream).then(
            () => this._writeProgress(size, size),
            null,
            written => this._writeProgress(written, size)
        ));
    }
}
