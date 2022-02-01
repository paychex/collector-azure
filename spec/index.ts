import * as expect from 'expect';
import { Spy, spy } from '@paychex/core/test';

import { eventHub, TrackingSubscriber } from '../index';

type LogFunction = (...data: any[]) => void;

describe('collectors', () => {

    describe('eventHub', () => {

        let timeout = globalThis.setTimeout;
        beforeEach(() => globalThis.setTimeout = spy() as any);
        afterEach(() => globalThis.setTimeout = timeout);

        let warn: LogFunction,
            error: LogFunction,
            log: LogFunction;

        beforeEach(() => {
            log = console.log;
            warn = console.warn;
            error = console.error;
            console.log = spy();
            console.warn = spy();
            console.error = spy();
        });

        afterEach(() => {
            console.log = log;
            console.warn = warn;
            console.error = error;
        });

        function TEST_HUB_PROVIDER(/* connection, name */) {
            const eventHub = {
                batch: {
                    count: 0,
                    items: [],
                    tryAdd: spy().invokes((item: any) => {
                        eventHub.batch.count++;
                        eventHub.batch.items.push(item);
                        return true;
                    }),
                },
                close: spy().returns(Promise.resolve()),
                sendBatch: spy().returns(Promise.resolve()),
            } as any;
            eventHub.createBatch = spy().returns(Promise.resolve(eventHub.batch));
            return hub = eventHub;
        }

        let hub: Record<string, any>,
            collector: TrackingSubscriber,
            provider: Spy;

        beforeEach(() => {
            provider = spy().invokes(TEST_HUB_PROVIDER);
            collector = eventHub({
                name: 'name',
                connection: 'connection',
                provider
            });
        });

        describe('factory', () => {

            it('schedules flush', (done) => {
                timeout(() => {
                    expect((setTimeout as unknown as Spy).called).toBe(true);
                    expect((setTimeout as unknown as Spy).args).toEqual([expect.any(Function), expect.any(Number)]);
                    done();
                });
            });

            it('warns if necessary', (done) => {
                collector = eventHub();
                timeout(() => {
                    expect((console.error as unknown as Spy).called).toBe(true);
                    done();
                });
            });

            it('logs to console if necessary', async () => {
                collector = eventHub();
                collector({ type: 'event', label: 'abc' });
                collector({ type: 'timer', label: 'def', duration: 15 });
                expect((console.log as unknown as Spy).calls[0].args[0]).toBe('[EVENT] abc');
                expect((console.log as unknown as Spy).calls[1].args[0]).toBe('[TIMER] def (15 ms)');
            });

            it('uses default provider if not specified', (done) => {
                collector = eventHub({
                    name: 'name',
                    connection: 'Endpoint=sb://voiceassistantdev.servicebus.windows.net/;SharedAccessKeyName=send-only;SharedAccessKey=3e83LnKHXdGnJYrmtBeetyIZJTVKuKlFu12KXNgNR7Q=;EntityPath=name'
                });
                timeout(() => {
                    expect((console.error as unknown as Spy).called).toBe(false);
                    done();
                });
            });

        });

        describe('flush', () => {

            it('sends batch', async () => {
                collector({ type: 'event' });
                await collector.flush();
                expect(hub.sendBatch.called).toBe(true);
            });

            it('logs errors to console', async () => {
                const err = new Error();
                hub.sendBatch.throws(err);
                collector({ type: 'event' });
                await collector.flush();
                expect((console.error as unknown as Spy).called).toBe(true);
                expect((console.error as unknown as Spy).args).toEqual([err.message, err.stack]);
            });

            it('reconnects hubs on error', async () => {
                hub.sendBatch.throws(new Error());
                collector({ type: 'event' });
                await collector.flush();
                expect(provider.callCount).toBe(2);
            });

            it('schedules next flush', async () => {
                await collector.flush();
                expect((setTimeout as unknown as Spy).callCount).toBe(2);
            });

        });

        describe('sendBatch', () => {

            it('sends batch', async () => {
                const item = { type: 'event' };
                collector(item);
                await collector.flush();
                expect(hub.sendBatch.called).toBe(true);
                expect(hub.sendBatch.args[0]).toBe(hub.batch);
                expect(hub.batch.items[0].body).toBe(item);
            });

            it('drops large items', async () => {
                hub.batch.tryAdd.returns(false);
                collector({ type: 'event' });
                await collector.flush();
                expect(hub.sendBatch.called).toBe(false);
            });

            it('recurses until empty', async () => {
                collector({ type: 'event' });
                collector({ type: 'event' });
                collector({ type: 'event' });
                collector({ type: 'event' });
                hub.batch.tryAdd.onCall(2).returns(false);
                await collector.flush();
                expect(hub.createBatch.callCount).toBe(2);
                expect(hub.batch.count).toBe(4);
            });

        });

    });

});