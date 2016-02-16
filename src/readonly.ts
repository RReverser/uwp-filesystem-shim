function readonly(target: Object, key: string) {
    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        set(value) {
            Object.defineProperty(this, key, {
                configurable: false,
                enumerable: true,
                value
            });
        }
    });
}
