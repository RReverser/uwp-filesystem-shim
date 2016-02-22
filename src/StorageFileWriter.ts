import { ProgressEventTarget, ProgressEventHandler, progressEvent } from './ProgressEvent';
import { AbortError, InvalidStateError } from './errors';
import { readonly } from './readonly';
import { StorageFile } from './winTypes';
import { Awaitable } from './async';

const enum ReadyState {
    INIT,
    WRITING,
    DONE
};

export class StorageFileWriter extends ProgressEventTarget implements FileWriter {
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

    constructor(private _file: StorageFile, private _length: number) {
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

    private async _write(write: (stream: Windows.Storage.Streams.IRandomAccessStream) => Awaitable<void>) {
        this._writeStart();
        let status: string;
        try {
            await (this._writingProcess = this._writeStart().then(async (stream) => {
                let position = this._position;
                let length = this._length = stream.size;
                if (position > length) {
                    position = this._position = length;
                }
                stream.seek(position);
                try {
                    await write(stream);
                    await stream.flushAsync();
                } finally {
                    this._length = stream.size;
                    this._position = Math.min(stream.position, this._length);
                    stream.close();
                }
            }));
            status = 'write';
        } catch (err) {
            if (!(this._error instanceof AbortError)) {
                status = 'error';
                this._error = err;
            }
        } finally {
            if (status) {
                this._writeEnd(status);
            }
        }
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
