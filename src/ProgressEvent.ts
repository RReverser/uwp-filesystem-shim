try {
    new ProgressEvent('test');
} catch (err) {
    let proto = ProgressEvent.prototype;
    ProgressEvent = proto.constructor = function (type: string, eventInitDict: ProgressEventInit = {}) {
        let event = document.createEvent('ProgressEvent');
        event.initProgressEvent(type, eventInitDict.bubbles, eventInitDict.cancelable, eventInitDict.lengthComputable, eventInitDict.loaded, eventInitDict.total);
        return event;
    } as any;
    ProgressEvent.prototype = proto;
}

export type ProgressEventHandler = (this: ProgressEventTarget, event: ProgressEvent) => (boolean | void);

export class ProgressEventTarget implements EventTarget {
    public static _eventTypes: string[] = [];

    public _listeners: {
        [type: string]: {
            attr: ProgressEventHandler,
            all: Set<ProgressEventHandler>
        }
    } = {};

    constructor() {
        for (let type of (this.constructor as typeof ProgressEventTarget)._eventTypes) {
            this._listeners[type] = {
                attr: null,
                all: new Set()
            };
        }
    }

    addEventListener(type: string, listener: ProgressEventHandler) {
        if (typeof listener === 'function') {
            this._listeners[type].all.add(listener);
        }
    }

    dispatchEvent(event: ProgressEvent) {
        for (let listener of this._listeners[event.type].all) {
            listener.call(this, event);
        }
        return !event.defaultPrevented;
    }

    removeEventListener(type: string, listener: ProgressEventHandler) {
        let listeners = this._listeners[type];
        if (listener !== listeners.attr) {
            listeners.all.delete(listener);
        }
    }
}

export function progressEvent(target: ProgressEventTarget, key: string) {
    const Ctor = target.constructor as typeof ProgressEventTarget;
    const type = key.slice(2);
    Ctor._eventTypes.push(type);
    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        get(this: ProgressEventTarget): ProgressEventHandler {
            return this._listeners[type].attr;
        },
        set(this: ProgressEventTarget, handler: ProgressEventHandler) {
            // .onstuff = ... firstly removes the old handler if present
            let listeners = this._listeners[type];
            listeners.all.delete(listeners.attr);
            if (typeof handler === 'function') {
                // then adds the new handler if it's callable
                handler = target => {
                    if (handler.call(target, event) === false) {
                        event.preventDefault();
                    }
                };
                this.addEventListener(type, handler);
            } else {
                // or simply sets .onstuff value to null if non-callable
                handler = null;
            }
            listeners.attr = handler;
        }
    });
}
