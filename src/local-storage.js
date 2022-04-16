import { localStorage } from 'local-storage'

const GA_CLIENT_ID_KEY = 'ga4_client_id'
const GA_MEASUREMENT_ID_KEY = 'ga4_measurement_id'
const GA_API_SECRET_KEY = 'ga4_api_secret'
const DEBUG_KEY = 'debug_key'

// cache in memory so we dont keep fetching from storage
let clientId = null
let measurementId = null
let apiSecret = null
let debug = null

export function getOrGenerateClientId() {
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

export function getMeasurementId() {
  if (!measurementId) {
    measurementId = localStorage.getItem(GA_MEASUREMENT_ID_KEY)
  }
  return measurementId
}

export function setMeasurementId(value) {
  measurementId = value
  localStorage.setItem(GA_MEASUREMENT_ID_KEY, value)
}

export function getApiSecret() {
  if (!apiSecret) {
    apiSecret = localStorage.getItem(GA_API_SECRET_KEY)
  }
  return apiSecret
}

export function setApiSecret(value) {
  apiSecret = value
  localStorage.setItem(GA_API_SECRET_KEY, value)
}

export function getDebug() {
  if (debug === null) {
    debug = localStorage.getItem(DEBUG_KEY) || false
  }
  return debug
}

export function setDebug(value) {
  debug = value
  localStorage.setItem(DEBUG_KEY, value)
}

export default {
  getOrGenerateClientId,
  getMeasurementId,
  setMeasurementId,
  getApiSecret,
  setApiSecret,
  getDebug,
  setDebug,
}
