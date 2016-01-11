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