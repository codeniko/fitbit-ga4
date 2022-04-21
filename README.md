# Fitbit Google Analytics 4 (GA4)
[![NPM version](https://img.shields.io/npm/v/fitbit-ga4.svg)](https://npmjs.org/package/fitbit-ga4)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/codeniko/fitbit-ga4/blob/master/LICENSE)

Google Analytics 4 (GA4) for Fitbit OS apps, clockfaces, and companions. This uses the new measurement protocol for GA4. Note that GA4 differs from the previous Universal Analytics as it's changed to be event based instead of sessions based.

## Installation
This module assumes you're using the [Fitbit CLI](https://dev.fitbit.com/build/guides/command-line-interface/) in your workflow, which allows you to manage packages using [npm](https://docs.npmjs.com/about-npm/). You can't include modules if you're using Fitbit Studio.

```
npm install --save fitbit-ga4
```

#### Permissions
You'll also need to add permissions for `access_internet` in your `package.json` file.
```
"requestedPermissions": [
  "access_internet"
]
```

## Configuration
Fitbit Google Analytics 4 requires an import in the companion in order to configure GA4.
You'll need to provide your [Measurement ID and API Secret](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?client_type=gtag).
#### Companion
```javascript
import ga from 'fitbit-ga4/companion'

ga.configure({
    measurementId: 'G-S2JKS12JK1',
    apiSecret: 'coWInB_MTmOaQ3AXhR12_g',
})
```

## Sending events
You can send events from both the app and companion. We provide a convenience function to send events for app loading, unloading, and display turning on. This is optional.
#### App
```javascript
import ga from 'fitbit-ga4/app'

ga.sendLoadAndDisplayOnEvents(true)
ga.send({ name: 'event_name' })
```

#### Companion
```javascript
import ga from 'fitbit-ga4/companion'

ga.send({ name: 'event_name' })
```

## Events with parameters
Events sent from the app and companion all support parameter similar to the GA4 spec. Additionally, you can send one event at a time, or multiple at once as an array of events.
```javascript
// single event with params
ga.send({
  name: 'event_name',
  params: {
    some_param1: 'value1',
    some_param2: 'value2',
  }
})

// multiple events with params per event
ga.send([
    { name: 'event_name1' },
    {
        name: 'event_name2',
        params: {
            some_param1: 'value1',
            some_param2: 'value2',
        }
    },
])
```

## User properties
You can set and clear user properties from both the app and companion. New user properties get appended alongside existing ones. If you want to change an existing user property, use the same key.
User properties are persisted in companion's local storage to be restored whenever companion reloads. Note, user property values are stored as Strings.
#### App/Companion
```javascript
// Set user properties
ga.setUserProperties({
    my_user_property: 'property_value'
})

// Clear persisted user properties
ga.clearUserProperties()

// View persisted user properties, NOTE only available in companion!
ga.getUserProperties()
```

After you integrate fitbit-ga4 into your fitbit app, verify events were successfully sent from your app in the `Realtime Overview` page, under the `Event count by Event name` section.

## Other notes
### Read if you use `file-transfer` in your fitbit project
Fitbit-ga4's companion uses `file-transfer` internally. By default, fitbit-ga4 is configured to auto process all file transfers.
This can conflict with your companion's file transfer processing. Fitbit SDK does a poor job here and doesn't allow modules to handle their own queues.
Regardless which of our companions processes first, the other will not receive its expected files.
In order to not interfere with each other's processing, you can disable fitbit-ga4's auto handling and forward unknown files to us to process manually instead.
Note: identify a file is yours based off the filename first before consuming it with `arrayBuffer()`, `cbor{}`, `json()`, or `text()`.
If you invoke one of those functions, fitbit-ga4 wont be able to consume that file's content after you.

#### Example companion disabling auto file transfer processing
```javascript
import { inbox } from 'file-transfer'
import ga from 'fitbit-ga4/companion'

ga.configure({
    // ... other options
    autoFileTransferProcessing: false
})

async function processAllFiles() {
    let file
    while ((file = await inbox.pop())) {
        if (file.name.startsWith('MY_FILE')) {
            // your processing logic
        } else {
            // unknown file, proxy to fitbit-ga4 for processing
            ga.processFileTransfer(file)
        }
    }
}
```

#### Client ID
Upon installation, a persistent client ID is created to anonymously identify the device. This is required by the Measurement Protocol API.

#### Automatic Load, Unload and Display events
We provide a convenience function to send events for app loading, unloading, and display turning on. You can enable this from the app side by invoking `ga.sendLoadAndDisplayOnEvents()`:
* `load` is emitted each time the app is loaded.
* `display_on` is emitted each time the device display turns on.
* `unload` is emitted each time the app is unloaded.

## Setting up GA4 on Google
1) Create new GA4 property (no need to create the UA property alongside it).
2) In Data Streams, choose the "Web" platform. Enter any URL and stream name. You can disable Enhanced measurements as those are tied to webpages and are irrelevant for fitbit apps.
3) Copy the Measurement ID at the top right; it starts with `G-`
4) On the same Data Stream page, scroll down and open `Measurement Protocol API secrets`. Create and copy the generated secret value.

## Debug logs
You can enable debug logs in both the app and companion. Companion's `ga.configure` function allows for an optional `debug` field. Similarly, App exposes a `ga.setDebug(true)` function.
