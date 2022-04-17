const { localStorage } = require('local-storage')

const GA_CLIENT_ID_KEY = 'ga4_client_id'
const GA_MEASUREMENT_ID_KEY = 'ga4_measurement_id'
const GA_API_SECRET_KEY = 'ga4_api_secret'
const DEBUG_KEY = 'debug_key'

// cache in memory so we dont keep fetching from storage
let clientId = null
let measurementId = null
let apiSecret = null
let debug = null

function getOrGenerateClientId() {
    // check storage first
    if (!clientId) {
        clientId = localStorage.getItem(GA_CLIENT_ID_KEY)
    }

    // generate it if not in storage
    if (!clientId) {
        clientId = `${Math.floor(Math.random() * 10000000000000000)}.${Date.now()}`
        localStorage.setItem(GA_CLIENT_ID_KEY, clientId)
    }
    return clientId
}

function getMeasurementId() {
    if (!measurementId) {
        measurementId = localStorage.getItem(GA_MEASUREMENT_ID_KEY)
    }
    return measurementId
}

function setMeasurementId(value) {
    measurementId = value
    localStorage.setItem(GA_MEASUREMENT_ID_KEY, value)
}

function getApiSecret() {
    if (!apiSecret) {
        apiSecret = localStorage.getItem(GA_API_SECRET_KEY)
    }
    return apiSecret
}

function setApiSecret(value) {
    apiSecret = value
    localStorage.setItem(GA_API_SECRET_KEY, value)
}

function getDebug() {
    if (debug === null) {
        debug = localStorage.getItem(DEBUG_KEY) || false
    }
    return debug
}

function setDebug(value) {
    debug = value
    localStorage.setItem(DEBUG_KEY, value)
}

const exportable = {
    getOrGenerateClientId,
    getMeasurementId,
    setMeasurementId,
    getApiSecret,
    setApiSecret,
    getDebug,
    setDebug,
}

module.exports = {
    ...exportable,
    default: exportable,
}
