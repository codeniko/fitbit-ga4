import { inbox } from 'file-transfer'
import {
    getDebug, setDebug,
    getOrGenerateClientId,
    getMeasurementId, setMeasurementId,
    getApiSecret, setApiSecret,
    getUserProperties as getUserPropertiesFromStorage,
    setUserProperties as setUserPropertiesInStorage,
    clearUserProperties as clearUserPropertiesFromStorage
} from './local-storage'
import {
    transformEventData, isObject,
    FILE_EVENT, FILE_USER_PROPERTIES, FILE_CLEAR_USER_PROPERTIES
} from './shared'
import fetchWrapper from './fetch-wrapper'

//====================================================================================================
// Configure options for Google analytics 4
// Options include: measurementId, apiSecret, autoFileTransferProcessing, debug
//====================================================================================================
export const configure = options => {
    if (!options) {
        return
    }

    const { measurementId, apiSecret, autoFileTransferProcessing } = options
    if (!measurementId || !apiSecret) {
        console.log('GA4: no measurement ID or API secret provided in configure, no events will be sent.')
        return
    }

    setMeasurementId(measurementId)
    setApiSecret(apiSecret)

    const debug = !!options.debug
    setDebug(debug)

    const shouldProcessAllFileTransfers = autoFileTransferProcessing !== undefined ? autoFileTransferProcessing : true // process all by default
    if (shouldProcessAllFileTransfers) {
        init()
    } else {
        console.warn('GA4: Disabled auto file transfer processing. Main companion must allow GA4 to process files by calling ga.processFileTransfer(file)')
    }
}

const isConfigured = () => getMeasurementId() && getApiSecret()

const init = () => {
    // Process new files as they arrive
    inbox.addEventListener('newfile', processAllFiles)

    // Process files on startup
    processAllFiles()
}

//====================================================================================================
// Send a single event object, or an array of events to GA4 servers
//====================================================================================================
export const send = event => {
    const data = transformEventData(event)

    // drop even if not configured. Configure should be the first function invoked for companion, before any send.
    if (!isConfigured()) {
        console.log('GA4: event sent prior to invoking configure, dropping event')
    } else {
        sendToGA(data)
    }
}

//====================================================================================================
// Extend user properties. Keys previously used will be overwritten. Companion persists these in local storage
//====================================================================================================
export const setUserProperties = userProperties => {
    if (!isObject(userProperties)) {
        console.log('GA4: Provided user properties are not in object form')
        return
    }

    // normalize all user property values to strings
    Object.keys(userProperties).forEach(key => {
        userProperties[key] = String(userProperties[key])
    })

    // merge new properties with existing properties from storage
    setUserPropertiesInStorage(Object.assign({}, getUserProperties(), userProperties))
    getDebug() && console.log(`GA4: Set user properties ${JSON.stringify(getUserProperties())}`)
}

//====================================================================================================
// Clear all previously stored user properties
//====================================================================================================
export const clearUserProperties = () => {
    clearUserPropertiesFromStorage()
}

//====================================================================================================
// Get all current stored user properties
//====================================================================================================
export const getUserProperties = () => getUserPropertiesFromStorage()

const sendToGA = (data) => {
    if (!data || !data.timestamp || !data.events) {
        return
    }
    if (!getMeasurementId() || !getApiSecret()) {
        console.log('GA4: no measurement ID or API secret')
        return
    }

    const body = {
        client_id: getOrGenerateClientId(),
        events: data.events,
        timestamp_micros: data.timestamp * 1000, // companion may not be connected by socket at the time of the event so always set it to that timestamp
    }
    if (Object.keys(getUserProperties()).length > 0) {
        body.user_properties = transformUserProperties(getUserProperties())
    }

    const bodyString = JSON.stringify(body)
    const debug = getDebug()
    debug && console.log(`GA4 Measurement ID: ${getMeasurementId()}`)
    debug && console.log(`GA4 Measurement API Secret: ${getApiSecret()}`)
    debug && console.log(`GA4 Client ID: ${getOrGenerateClientId()}`)
    debug && console.log('GA4 POST Payload: ', bodyString)

    fetchWrapper(`https://www.google-analytics.com/mp/collect?measurement_id=${getMeasurementId()}&api_secret=${getApiSecret()}`, {
        method: 'POST',
        body: bodyString,
    })
}

//====================================================================================================
// Process file transfer. Required if configured to disable autoFileTransferProcessing because main project also
// utilizes file transfers.
// Returns true if it's a GA4 file and is processed, false otherwise
//====================================================================================================
export const processFileTransfer = async file => {
    let processed = false
    if (!isConfigured()) {
        console.warn('GA4: processFileTransfer invoked but GA4 is not configured')
        return processed
    }

    if (file.name.startsWith(FILE_EVENT)) {
        const payload = await file.cbor()
        getDebug() && console.log(`GA4: File ${file.name} is being processed.`)
        processed = true
        sendToGA(payload)
    } else if (file.name.startsWith(FILE_USER_PROPERTIES)) {
        const payload = await file.cbor()
        getDebug() && console.log(`GA4: File ${file.name} is being processed.`)
        processed = true
        setUserProperties(payload)
    } else if (file.name.startsWith(FILE_CLEAR_USER_PROPERTIES)) {
        await file.cbor() // expecting no data, consuming so it leaves inbox
        getDebug() && console.log(`GA4: File ${file.name} is being processed.`)
        processed = true
        clearUserProperties()
    }
    return processed
}

const processAllFiles = async () => {
    if (!isConfigured()) {
        return
    }

    let file
    while ((file = await inbox.pop())) {
       processFileTransfer(file)
    }
}

// measurement protocol api requires values to be wrapped in an object with a value field
const transformUserProperties = userProperties => {
    const newProps = {}
    Object.keys(userProperties).forEach(key => {
        newProps[key] = { value : userProperties[key] }
    })
    return newProps
}

const exportable = {
    configure,
    processFileTransfer,
    send,
    setUserProperties,
    clearUserProperties,
    getUserProperties,
}

export default exportable
