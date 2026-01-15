import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('EventBus', () => {
    let bus;

    beforeEach(() => {
        bus = new EventBus();
    });

    describe('on() and emit()', () => {
        it('calls registered listener with event data', () => {
            const listener = vi.fn();
            bus.on('test:event', listener);

            bus.emit('test:event', { foo: 'bar' });

            expect(listener).toHaveBeenCalledWith({ foo: 'bar' });
        });

        it('supports multiple listeners for the same event', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            bus.on('test', listener1);
            bus.on('test', listener2);
            bus.emit('test', 'data');

            expect(listener1).toHaveBeenCalledWith('data');
            expect(listener2).toHaveBeenCalledWith('data');
        });

        it('does nothing when emitting event with no listeners', () => {
            expect(() => bus.emit('nonexistent', {})).not.toThrow();
        });

        it('supports multiple different events', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            bus.on('event1', listener1);
            bus.on('event2', listener2);

            bus.emit('event1', 'a');
            bus.emit('event2', 'b');

            expect(listener1).toHaveBeenCalledWith('a');
            expect(listener2).toHaveBeenCalledWith('b');
        });
    });

    describe('off()', () => {
        it('removes specific listener', () => {
            const listener = vi.fn();
            bus.on('test', listener);
            bus.off('test', listener);

            bus.emit('test', 'data');

            expect(listener).not.toHaveBeenCalled();
        });

        it('does nothing when removing non-existent listener', () => {
            const listener = vi.fn();
            expect(() => bus.off('test', listener)).not.toThrow();
        });

        it('keeps other listeners when removing one', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            bus.on('test', listener1);
            bus.on('test', listener2);
            bus.off('test', listener1);

            bus.emit('test', 'data');

            expect(listener1).not.toHaveBeenCalled();
            expect(listener2).toHaveBeenCalledWith('data');
        });
    });

    describe('unsubscribe return value', () => {
        it('returns a function that unsubscribes the listener', () => {
            const listener = vi.fn();
            const unsubscribe = bus.on('test', listener);

            unsubscribe();
            bus.emit('test', 'data');

            expect(listener).not.toHaveBeenCalled();
        });
    });
});
