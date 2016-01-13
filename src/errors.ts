class AbortError extends Error {}
class InvalidStateError extends Error {}
class NoModificationAllowedError extends Error {}
class SecurityError extends Error {}

class NotImplementedError extends Error {
    constructor() {
        super('Not implemented.');
    }
} 