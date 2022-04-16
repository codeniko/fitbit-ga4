import { inbox } from 'file-transfer'
import { getDebug, setDebug, getOrGenerateClientId, getMeasurementId, setMeasurementId, getApiSecret, setApiSecret } from './local-storage'
import shared from './shared'

// Update global options
const configure = options => {
    if (!options) {
        return
    }

    const { measurementId, apiSecret, debug } = options
    if (!measurementId || !apiSecret) {
        console.log('GA4 configure: no measurement ID or API secret provided, no events will be sent.')
        return
    }

    setMeasurementId(measurementId)
    setApiSecret(apiSecret)
    if (typeof debug === 'boolean') {
        setDebug(debug)
    }

    init()
}

const isConfigured = () => getMeasurementId() && getApiSecret()

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

    // drop even if not configured. Configure should be the first function invoked for companion, before any send.
    if (!isConfigured()) {
        console.log('companion: event sent prior to invoking configure, dropping event')
    } else {
        sendToGA(data)
    }
}

const sendToGA = (data) => {
    if (!data) {
        return
    }
    if (!getMeasurementId() || !getApiSecret()) {
        console.log('companion: no measurement ID or API secret')
        return
    }

    const body = {
        client_id: getOrGenerateClientId(),
        events: data.events,
    }

    // Prefer time of event when it was enqueued. Old UA noted that events older than 4 hours may not be processed so maintain that here until documented otherwise
    // https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#qt
    const queueTime = Date.now() - data.timestamp
    if (queueTime < 14400000) {
        body.timestamp_micros = data.timestamp * 1000000
    }

    const bodyString = JSON.stringify(body)
    const debug = getDebug()
    debug && console.log(`Measurement ID: ${getMeasurementId()}`)
    debug && console.log(`Measurement API Secret: ${getApiSecret()}`)
    debug && console.log(`Client ID: ${getOrGenerateClientId()}`)
    debug && console.log('GA4 POST Payload: ', bodyString)

    fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${getMeasurementId()}&api_secret=${getApiSecret()}`, {
        method: 'POST',
        body: bodyString,
    })
}

const process_files = async () => {
    if (!isConfigured()) {
        return
    }

    let file
    while ((file = await inbox.pop())) {
        const payload = await file.cbor()
        if (file.name.startsWith('_google_analytics4_')) {
            getDebug() && console.log(`File: ${file.name} is being processed.`)
            sendToGA(payload)
        }
    }
}

const analytics = {
    configure,
    send,
}

export default analytics
