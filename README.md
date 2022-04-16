# Fitbit Google Analytics 4 (GA4)
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


#### Note on event timestamps
GA4 Measurement protocol is still in beta. It's worth noting that in the prior Universal Analytics version of the Google Analytics with hits, [hits fired with a timestamp older than 4 hours may not be processed once they reach GA servers](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#qt). Thus, always sending events with the event timestamp could have potentially lead to data loss in UA.
It's unclear whether this behavior continues on in GA4. This is problematic for fitbit analytics since the Bluetooth connection between the device and the companion is not always active, event data may be sent long after the event actually took place. 
To account for this possibility and the current undocumented behavior, events enqueued longer than 4 hours from the time they were sent to the time the companion wakes up will use the timestamp of when they are processed, not the actual event time.
This is to be re-evaluated once GA4 Measurement protocol moves outside beta and better documented, or good outside information is discovered about this behavior.

