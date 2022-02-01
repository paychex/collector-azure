/**
 * Provides an Azure EventHubs collector that can be used with `@paychex/core` Tracker.
 *
 * @module main
 */

import { pull, noop, identity, defaults } from 'lodash';
import { EventDataBatch, EventHubProducerClient } from '@azure/event-hubs';

import type { TrackingInfo, TrackingSubscriber } from '@paychex/core/types/trackers';
export type { TrackingInfo, TrackingSubscriber }

/** @ignore */
export interface EventHubProvider {
    (...args: any[]): EventHubProducerClient
}

export interface EventHubConfiguration {

    /** The name of the Event Hub to connect to. */
    name: string,

    /** The full connection string of the Event Hub to connect to. */
    connection: string,

    /**
     * The formatter to use to convert a TrackingInfo item into
     * a payload suitable for the EventHub. If not provided, the
     * entry will be persisted as a normal JSON object.
     */
    formatter?: (info: TrackingInfo) => Record<string, any>,

    /** @ignore */
    provider?: EventHubProvider

}

function CONSOLE_LOGGER(info: TrackingInfo): void {
    const label = info.label;
    const type = info.type.toUpperCase();
    const duration = info.duration > 0 ?
        ` (${info.duration} ms)` : '';
    console.log(`[${type}] ${label}${duration}`);
}

function AZURE_EVENTHUB_PROVIDER(connection: string, name: string): EventHubProducerClient {
    return new EventHubProducerClient(connection, name);
}

/**
 * Constructs a collector method that can persist TrackingInfo items to an
 * Azure EventHub in batches. Uses known size and constraint limitations to
 * ensure events reach the hub, and retries if any failures occur.
 *
 * @param options The options required to create the EventHub.
 * @returns A collector that can be passed to @paychex/core's `createTracker` method.
 * @example
 * ```js
 * const hub = eventHub({
 *   name: process.env.HUB_NAME,
 *   connection: process.env.HUB_CONNECTION
 * });
 *
 * const tracker = trackers.create(hub);
 *
 * // this data will be sent to the EventHub
 * tracker.event('label', { optional: 'data' });
 *
 * // we send events to the eventHub every 1 second;
 * // you can force an immediate send by calling flush:
 * hub.flush();
 * ```
 */
export function eventHub(options: Partial<EventHubConfiguration> = Object.create(null)): TrackingSubscriber {

    const {
        name,
        connection,
        formatter,
        provider,
    } = defaults(options, {
        formatter: identity,
        provider: AZURE_EVENTHUB_PROVIDER,
    });

    let hub: EventHubProducerClient = null;
    const queue: TrackingInfo[] = [];

    function collect(info: TrackingInfo): void {
        hub ?
            queue.push(info) :
            CONSOLE_LOGGER(info);
    }

    async function connectHubs() {
        if (!name || !connection)
            console.warn('An EventHub name and connection string are required. Logging to console instead.');
        if (hub)
            await hub.close().catch(noop);
        hub = provider(connection, name);
    }

    async function sendBatch() {
        let item: TrackingInfo,
            result = true;
        const sent: TrackingInfo[] = [];
        const items: TrackingInfo[] = queue.concat();
        const batch: EventDataBatch = await hub.createBatch();
        while (result && (item = items.shift())) {
            result = batch.tryAdd({ body: formatter(item) });
            result ? sent.push(item) : items.unshift(item);
        }
        if (batch.count) {
            // send batch and remove
            // sent items from the queue
            await hub.sendBatch(batch);
            pull(queue, ...sent);
        } else if (item) {
            // batch is empty but there
            // was an item to send, so it
            // must be too large for our
            // EventHub; we'll need to drop
            // it; otherwise, our other
            // events would never be sent
            pull(queue, item);
            pull(items, item);
        }
        if (items.length) {
            // recurse until there are no
            // more events to send
            await sendBatch();
        }
    }

    async function flushQueue() {
        try {
            await sendBatch();
        } catch (e) {
            console.error(e.message, e.stack);
            await connectHubs();
        } finally {
            scheduleFlush();
        }
    }

    function scheduleFlush() {
        setTimeout(flushQueue, 1000);
    }

    connectHubs()
        .then(scheduleFlush)
        .catch(console.error);

    collect.flush = flushQueue;

    return collect;

}
