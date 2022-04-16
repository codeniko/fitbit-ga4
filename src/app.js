import { me as appbit } from "appbit"
import { me as device } from "device"
import { display } from "display"
import { encode } from "cbor"
import { outbox } from "file-transfer"
import { readFileSync, writeFileSync } from "fs"
import shared from './shared'

//====================================================================================================
// Configure
//====================================================================================================

let mesaurementId = null
let apiSecret = null
let debug = false
let configured = false

// Update global options
const configure = options => {
  if (!options) {
    return
  }

  mesaurementId = options.mesaurementId
  apiSecret = options.apiSecret
  debug = options.debug || debug
  // TODO user_properties

  if (!mesaurementId || !apiSecret) {
    console.log('GA4 configure: no measurement ID or API secret provided, no events will be sent.')
    return
  }

  configured = true
  onload()
}

//====================================================================================================
// Send
// Can be a single event object, or array of events
//====================================================================================================
const send = event => {
  if (!configured) {
    console.log('GA4 send: GA4 not configured, dropping event')
    return
  }

  const data = shared.transformData(event)
  data.measurementId = mesaurementId
  data.apiSecret = apiSecret
  data.debug = debug

  // Generate a unique filename
  const filename = "_google_analytics_" + (Math.floor(Math.random() * 10000000000000000))
  // Enqueue the file
  outbox.enqueue(filename, encode(data)).then(() => {
    debug && console.log("File: " + filename + " transferred successfully.")
  }).catch(function (error) {
    debug && console.log("File: " + filename + " failed to transfer.")
  })
}

//====================================================================================================
// Automatic Events
//====================================================================================================

// Send a hit on load
const onload = () => {
  send({
    name: 'load',
  })
}

// Send a hit each time the display turns on
display.addEventListener("change", () => {
  send({
    name: 'display',
    params: {
      value: display.on ? 'on' : 'off',
    },
  })
})

// Send a hit on unload
appbit.addEventListener("unload", () => {
  send({
    name: 'unload',
  })
})

const analytics = {
  configure,
  send,
}

export default analytics
