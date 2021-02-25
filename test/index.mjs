import expect from 'expect';
import { spy } from '@paychex/core/test/utils.mjs';

import { eventHubs } from '../index.mjs';

describe('collectors', () => {

    describe('eventHubs', () => {

        let timeout = globalThis.setTimeout;
        beforeEach(() => globalThis.setTimeout = spy());
        afterEach(() => globalThis.setTimeout = timeout);

        let warn, error, log;

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
            const eventHub = {};
            eventHub.batch = {
                count: 0,
                items: [],
                tryAdd: spy().invokes(item => {
                    eventHub.batch.count++;
                    eventHub.batch.items.push(item);
                    return true;
                }),
            };
            eventHub.close = spy().returns(Promise.resolve());
            eventHub.sendBatch = spy().returns(Promise.resolve());
            eventHub.createBatch = spy().returns(Promise.resolve(eventHub.batch));
            return hub = eventHub;
        }

        let hub,
            collector,
            provider;

        beforeEach(() => {
            provider = spy().invokes(TEST_HUB_PROVIDER);
            collector = eventHubs({
                name: 'name',
                connection: 'connection',
                provider
            });
        });

        describe('factory', () => {

            it('schedules flush', (done) => {
                timeout(() => {
                    expect(setTimeout.called).toBe(true);
                    expect(setTimeout.args).toEqual([expect.any(Function), expect.any(Number)]);
                    done();
                });
            });

            it('warns if necessary', (done) => {
                collector = eventHubs();
                timeout(() => {
                    expect(console.error.called).toBe(true);
                    done();
                });
            });

            it('logs to console if necessary', async () => {
                collector = eventHubs();
                collector({ type: 'event', label: 'abc' });
                collector({ type: 'timer', label: 'def', duration: 15 });
                expect(console.log.calls[0].args[0]).toBe('[EVENT] abc');
                expect(console.log.calls[1].args[0]).toBe('[TIMER] def (15 ms)');
            });

            it('uses default provider if not specified', (done) => {
                collector = eventHubs({
                    name: 'name',
                    connection: 'Endpoint=sb://voiceassistantdev.servicebus.windows.net/;SharedAccessKeyName=send-only;SharedAccessKey=3e83LnKHXdGnJYrmtBeetyIZJTVKuKlFu12KXNgNR7Q=;EntityPath=name'
                });
                timeout(() => {
                    expect(console.error.called).toBe(false);
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
                expect(console.error.called).toBe(true);
                expect(console.error.args).toEqual([err.message, err.stack]);
            });

            it('reconnects hubs on error', async () => {
                hub.sendBatch.throws(new Error());
                collector({ type: 'event' });
                await collector.flush();
                expect(provider.callCount).toBe(2);
            });

            it('schedules next flush', async () => {
                await collector.flush();
                expect(setTimeout.callCount).toBe(2);
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