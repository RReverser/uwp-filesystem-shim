class AbortError extends DOMError {}
class InvalidStateError extends DOMError {}
class NoModificationAllowedError extends DOMError {}
class SecurityError extends DOMError {}

class NotImplementedError extends Error {
    constructor() {
        super('Not implemented.');
    }
} 