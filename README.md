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

## Setting up GA4 on Google
1) Create new GA4 property (no need to create the UA property alongside it).
2) In Data Streams, choose the "Web" platform. Enter any URL and stream name. You can disable Enhanced measurements as those are tied to webpages and are irrelevant for fitbit apps.
3) Copy the Measurement ID at the top right; it starts with `G-`
4) On the same Data Stream page, scroll down and open `Measurement Protocol API secrets`. Create and copy the generated secret value.

After you integrate fitbit-ga4 into your fitbit app, verify events were successfully sent from your app in the `Realtime Overview` page, under the `Event count by Event name` section.

## Debug logs
You can enable debug logs in both the app and companion. Companion's `ga.configure` function allows for an optional `debug` field. Similarly, App exposes a `ga.setDebug(true)` function.

## Other notes
#### Client ID
Upon installation, a persistent client ID is created to anonymously identify the device. This is required by the Measurement Protocol API.

#### Automatic Load, Unload and Display events
We provide a convenience function to send events for app loading, unloading, and display turning on. You can enable this from the app side by invoking `ga.sendLoadAndDisplayOnEvents()`:
* `load` is emitted each time the app is loaded.
* `display_on` is emitted each time the device display turns on.
* `unload` is emitted each time the app is unloaded.
