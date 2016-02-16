try {
    new ProgressEvent('test');
} catch (err) {
    let proto = ProgressEvent.prototype;
    ProgressEvent = proto.constructor = function (type: string, eventInitDict: ProgressEventInit = {}) {
        let event = document.createEvent('ProgressEvent');
        event.initProgressEvent(type, eventInitDict.bubbles, eventInitDict.cancelable, eventInitDict.lengthComputable, eventInitDict.loaded, eventInitDict.total);
        return event;
    };
    ProgressEvent.prototype = proto;
}

type ProgressEventHandler = (event: ProgressEvent) => void;

interface ProgressEventHandlerMap {
    [name: string]: ProgressEventHandler;
}

class ProgressEventTarget implements EventTarget {
    private static _eventTypes: string[];
    private _listeners: { [type: string]: Set<ProgressEventHandler> } = Object.create(null);

    constructor() {
        (<typeof ProgressEventTarget>this.constructor)._eventTypes.forEach(type => {
            this._listeners[type] = new Set();
            (<ProgressEventHandlerMap><any>this)[`_on${type}`] = null;
        });
    }

    addEventListener(type: string, listener: ProgressEventHandler) {
        if (typeof listener === 'function') {
            this._listeners[type].add(listener);
        }
    }

    dispatchEvent(event: ProgressEvent) {
        this._listeners[event.type].forEach(listener => listener.call(this, event));
        return !event.defaultPrevented;
    }

    removeEventListener(type: string, listener: ProgressEventHandler) {
        this._listeners[type].delete(listener);
    }

    static _defineEventAttr(key: string) {
        const type = key.slice(2);
        const privateKey = `_${key}`;
        (this._eventTypes || (this._eventTypes = [])).push(type);
        Object.defineProperty(this.prototype, key, {
            configurable: true,
            enumerable: true,
            get(): ProgressEventHandler {
                return this[privateKey];
            },
            set(handler: ProgressEventHandler) {
                // .onstuff = ... firstly removes the old handler if present
                let normalizedHandler = (<ProgressEventHandlerMap>this)[privateKey];
                if (normalizedHandler !== null) {
                    (<ProgressEventTarget>this).removeEventListener(type, normalizedHandler);
                }
                if (typeof handler === 'function') {
                    // then adds the new handler if it's callable
                    normalizedHandler = target => {
                        if (handler.call(target, event) === false) {
                            event.preventDefault();
                        }
                    };
                    (<ProgressEventTarget>this).addEventListener(type, normalizedHandler);
                } else {
                    // or simply sets .onstuff value to null if non-callable
                    normalizedHandler = null;
                }
                (<ProgressEventHandlerMap>this)[privateKey] = normalizedHandler;
            }
        });
    }
}

function progressEvent(target: ProgressEventTarget, key: string) {
    (<typeof ProgressEventTarget>target.constructor)._defineEventAttr(key);
}
