/**
 * Provides an Azure EventHubs collector that can be used with `@paychex/core` Tracker.
 *
 * @module index
 */

import { pull, noop, identity } from 'lodash-es';
import { EventHubProducerClient } from '@azure/event-hubs';

function CONSOLE_LOGGER(info) {
    const label = info.label;
    const type = info.type.toUpperCase();
    const duration = info.duration > 0 ?
        ` (${info.duration} ms)` : '';
    console.log(`[${type}] ${label}${duration}`);
}

function AZURE_EVENTHUB_PROVIDER(connection, name) {
    return new EventHubProducerClient(connection, name);
}

/**
 * Constructs a collector method that can persist TrackingInfo items to an
 * Azure EventHub in batches. Uses known size and constraint limitations to
 * ensure events reach the hub, and retries if any failures occur.
 *
 * @function
 * @param {object} options The options required to create the EventHub.
 * @param {string} options.name The name of the Event Hub to connect to.
 * @param {string} options.connection The full connection string of the Event Hub to connect to.
 * @param {function} [options.formatter] The formatter to use to convert a TrackingInfo
 * item into a payload suitable for the EventHub. If not provided, the entry will be persisted
 * as a normal JSON object.
 * @returns {function} A collector that can be passed to @paychex/core's `createTracker` method.
 * @example
 * const hub = eventHubs({
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
 */
export function eventHubs({
    name,
    connection,
    formatter = identity,
    provider = AZURE_EVENTHUB_PROVIDER, // for testing purposes
} = Object.create(null)) {

    let hub = null;
    const queue = [];

    function collect(info) {
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
        let item, result = true;
        const sent = [];
        const items = queue.concat();
        const batch = await hub.createBatch();
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
