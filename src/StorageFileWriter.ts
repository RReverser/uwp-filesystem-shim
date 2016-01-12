const enum ReadyState {
    INIT,
    WRITING,
    DONE
};

class StorageFileWriter extends ProgressEventTarget implements FileWriter {
    INIT = ReadyState.INIT;
    WRITING = ReadyState.WRITING;
    DONE = ReadyState.DONE;

    private _readyState: number = ReadyState.INIT;
    private _error: DOMError = null;
    private _writingProcess: Windows.Foundation.IPromise<any> = null;
    
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
        return this._stream.position;
    }

    get length() {
        return this._stream.size;
    }

    constructor(private _stream: Windows.Storage.Streams.IRandomAccessStream) {
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
        this._stream.seek(offset);
    }

    private _writeStart() {
        if (this._readyState === ReadyState.WRITING) {
            throw new InvalidStateError();
        }
        this._readyState = ReadyState.WRITING;
        this._error = null;
        this.dispatchEvent(new ProgressEvent('writestart'));
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

    private _write(write: (stream: Windows.Storage.Streams.IRandomAccessStream) => Windows.Foundation.IPromise<any>) {
        this._writeStart();
        this._writingProcess = write(this._stream);
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
            return stream.flushAsync().then(() => {
                if (this._stream.position > newLength) {
                    this._stream.position = newLength;
                }
            });
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
