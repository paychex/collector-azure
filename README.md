# @paychex/collector-azure

Provides an Azure Event Bus collector for use with a [@paychex/core](https://github.com/paychex/core) Tracker.

## Installation

```bash
npm install @paychex/collector-azure
```

## Usage

Construct a new Azure Event Hub collector for use in the `@paychex/core` Tracker by passing a configuration object with the following keys:

| key | type | description |
| --- | --- | --- |
| name | `string` | **required** The name of the Event Hub to connect to. |
| connection | `string` | **required** The full connection string of the Event Hub to connect to. |
| formatter | `Function` | _optional_ Function to use to format the `TrackingInfo` instance into an Azure Event Hub entry. |

```js
import createTracker from '@paychex/core/tracker/index.js';
import eventHubs from '@paychex/collector-azure/index.js';

const hub = eventHubs({
  name: process.env.HUB_NAME,
  connection: process.env.HUB_CONNECTION
});

const tracker = createTracker(hub);
```
