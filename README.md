# Fitbit Google Analytics 4 (GA4)
Google Analytics 4 (GA4) for Fitbit OS apps, clockfaces, and companions. This uses the new measurement protocol for GA4. Note that GA4 differs from the previous Universal Analytics as it's changed to be event based instead of sessions based.

## Installation
This module assumes you're using the [Fitbit CLI](https://dev.fitbit.com/build/guides/command-line-interface/) in your workflow, which allows you to manage packages using [npm](https://docs.npmjs.com/about-npm/). You can't include modules if using Fitbit Studio.

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

## Usage
Fitbit Google Analytics 4 requires an import statement in both the app and the companion. In the app, you'll also need to configure Google Analytics by entering your [Measurement ID and API Secret](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?client_type=gtag).
#### App
```javascript
import ga from 'fitbit-ga4/app'

ga.configure({
  mesaurementId: 'G-S2JKS12JK1',
  apiSecret: 'coWInB_MTmOaQ3AXhR12_g'
})
```
#### Companion
```javascript
import 'fitbit-ga4/companion'
```

## Guide
#### Client ID
Upon installation, a persistent client ID is created to anonymously identify the device. This is required by the Measurement Protocol API.

#### Automatic Hits
Fitbit Google Analytics 4 will automatically send the following events:
* `load` is emitted each time the app is loaded.
* `display` is emitted each time the device display turns on or off.
* `unload` is emitted each time the app is unloaded.

#### Custom Events
In addition to the base events that GA4 supports and defines, you can also send your own custom events. All events follow the same format. You can send one event at a time, or multiple at once as an array of events.
##### Event examples
```javascript
// single events with optional params
ga.send({ name: 'event_name })

ga.send({
  name: 'event_name',
  params: {
    some_param1: 'value1',
    some_param2: 'value2',
  }
})

// multiple events with optional params per event
ga.send([{
  name: 'event_name1'
}, {
  name: 'event_name2'
}])
```

#### Note on event timestamps
Fitbit Google Analytics 4 will best attempt to use the timestamp of the events at the time they were sent. While GA4 Measurement protocol is still in beta, it's worth noting that in the prior Universal Analytics version of the Google Analytics with hits, hits fired with a timestamp older than 4 hours may not be processed. This could have potentially lead to data loss. It's unclear whether this behavior continues on in GA4. This is problematic for fitbit analytics since the Bluetooth connection between the device and the companion is not always active, event data may be sent long after the event actually took place. To account for this possibility and the current undocumented behavior, events enqueued longer than 4 hours from the time they were sent to the time the companion wakes up will use the timestamp of when they are processed, not the actual event time. This is to be re-evaluated once GA4 Measurement protocol moves outside beta and better documented, or good outside information is discovered about this behavior.

