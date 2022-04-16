import { encode } from 'cbor'
import { inbox } from 'file-transfer'
import { getDebug, setDebug, getOrGenerateClientId, getMeasurementId, setMeasurementId, getApiSecret, setApiSecret } from './local-storage'
import shared from './shared'

// initial event queue fired from companion side but we dont have GA4 measurement id or secret set yet.
const initEventQueue = []

const init = () => {
    // Process new files as they arrive
    inbox.addEventListener('newfile', process_files)

    // Process files on startup
    process_files()
}

//====================================================================================================
// Send
// Can be a single event object, or array of events
//====================================================================================================
const send = event => {
    const data = shared.transformData(event)

    // can only se this happening on first session right when app installed and companions happens to attempt to send some event before app does its 'load' event
    if (!getMeasurementId() || !getApiSecret()) {
        console.log('companion: GA4 measurement ID or secret not found, enqueuing event data.')
        initEventQueue.push(data)
    } else {
        sendToGA(data)
    }
}

const sendToGA = (data) => {
    if (!data) {
        return
    }

    const debug = data.debug !== undefined ? data.debug : getDebug()

    // check if incoming data has GA4 ID and secret set, persist if it's different in case of new builds
    if (data.mesaurementId && data.mesaurementId != getMeasurementId()) {
        console.log(`setting measure id ${data.mesaurementId}`)
        setMeasurementId(data.mesaurementId)
    }
    if (data.apiSecret && data.apiSecret != getApiSecret()) {
        console.log(`setting secret  ${data.apiSecret}`)
        setApiSecret(data.apiSecret)
    }
    if (debug != getDebug()) {
        setDebug(data.debug)
    }

    const body = {
        client_id: getOrGenerateClientId(),
        events: data.events,
    }

    debug && console.log(`Measurement ID: ${getMeasurementId()}`)
    debug && console.log(`Measurement API Secret: ${getApiSecret()}`)
    debug && console.log(`Client ID: ${getOrGenerateClientId()}`)

    // Prefer time of event when it was enqueued. Old UA noted that events older than 4 hours may not be processed so maintain that here until documented otherwise
    // https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#qt
    const queueTime = Date.now() - data.timestamp
    if (queueTime < 14400000) {
        body.timestamp_micros = data.timestamp * 1000000
    }

    const bodyString = JSON.stringify(body)
    debug && console.log('body', bodyString)
    if (!getMeasurementId() || !getApiSecret()) {
        console.log('companion: no measurement ID or API secret')
        return
    }

    fetch(`https://www.google-analytics.com/mp/collect?mesaurementId=${getMeasurementId()}&apiSecret=${getApiSecret()}`, {
        method: 'POST',
        body: bodyString,
    })
}

const process_files = async () => {
    let file
    while ((file = await inbox.pop())) {
        const payload = await file.cbor()
        if (file.name.startsWith('_google_analytics_')) {
            payload && payload.debug && console.log('File: ' + file.name + ' is being processed.')
            sendToGA(payload)
        }
    }

    // handle any items in companion queue
    if (initEventQueue.length > 0) {
        initEventQueue.forEach(data => send(data))
        initEventQueue = []
    }
}

const analytics = {
    init,
    send,
}

export default analytics
