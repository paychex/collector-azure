# @paychex/collector-azure

Provides an Azure Event Bus collector for use with a [@paychex/core](https://github.com/paychex/core) Tracker.

## Installation

```bash
npm install @paychex/collector-azure
```

## Importing

### esm

```js
import { eventHub } from '@paychex/collector-azure';
```

### cjs

```js
const { eventHub } = require('@paychex/collector-azure');
```

### amd

```js
define(['@paychex/collector-azure'], function(collectors) { ... });
define(['@paychex/collector-azure'], function({ eventHub }) { ... });
```

```js
require(['@paychex/collector-azure'], function(collectors) { ... });
require(['@paychex/collector-azure'], function({ eventHub }) { ... });
```

### iife (browser)

```js
const { eventHub } = window['@paychex/collector-azure'];
```

## Usage

Construct a new Azure Event Hub collector for use in the `@paychex/core` Tracker by passing a configuration object with the following keys:

| key | type | description |
| --- | --- | --- |
| name | `string` | **required** The name of the Event Hub to connect to. |
| connection | `string` | **required** The full connection string of the Event Hub to connect to. |
| formatter | `Function` | _optional_ Function to use to format the `TrackingInfo` instance into an Azure Event Hub entry. |

```js
import { trackers } from '@paychex/core';
import { eventHub } from '@paychex/collector-azure';

const hub = eventHub({
  name: process.env.HUB_NAME,
  connection: process.env.HUB_CONNECTION
});

const tracker = trackers.create(hub);
```
