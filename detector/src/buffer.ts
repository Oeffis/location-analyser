export class Buffer<C> extends Array<C> {
    constructor(private readonly capacity: number) {
        super();
    }

    public append(item: C): C {
        this.push(item);
        return item;
    }

    public push(...items: C[]): number {
        const newLength = super.push(...items);
        if (newLength > this.capacity) {
            this.splice(0, newLength - this.capacity);
        }

        return newLength;
    }

    public last(): C | undefined {
        return this[this.length - 1];
    }
}
