const enum ReadyState {
    INIT,
    WRITING,
    DONE
};

type ProgressEventHandler = (event: ProgressEvent) => void;

class StorageFileWriter implements FileWriter {
    INIT = ReadyState.INIT;
    WRITING = ReadyState.WRITING;
    DONE = ReadyState.DONE;

    private _readyState: number = ReadyState.INIT;
    private _error: DOMError = null;
    private _writingProcess: Windows.Foundation.IPromise<any> = null;
    
    private _listeners: { [type: string]: ProgressEventHandler[] } = Object.create(null);

    addEventListener(type: string, listener: ProgressEventHandler) {
        this._listeners[type].push(listener);
    }
    
    dispatchEvent(event: ProgressEvent) {
        this._listeners[event.type].forEach(function (listener) {
            listener.call(this, event);
        }, this);
        return event.defaultPrevented;
    }
    
    removeEventListener(type: string, listener: ProgressEventHandler) {
        let listeners = this._listeners[type];
        let index = listeners.indexOf(listener);
        if (index < 0) return;
        listeners.splice(index, 1);
    }

    onwritestart: ProgressEventHandler;
    onprogress: ProgressEventHandler;
    onwrite: ProgressEventHandler;
    onabort: ProgressEventHandler;
    onerror: ProgressEventHandler;
    onwriteend: ProgressEventHandler;

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
        ['writestart', 'progress', 'write', 'abort', 'error', 'writeend'].forEach(type => {
            let name = `on${type}`;
            let progressEvents = <{ [name: string]: ProgressEventHandler }><any>this;
            progressEvents[name] = null;
            this._listeners[type] = [event => {
                let handler = progressEvents[name];
                if (typeof handler === 'function') {
                    let result = handler.call(this, event);
                    if (result === false) {
                        event.preventDefault();
                    }
                }
            }];
        });
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
