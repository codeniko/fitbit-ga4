import { me as appbit } from 'appbit'
import { display } from 'display'
import { encode } from 'cbor'
import { outbox } from 'file-transfer'
import { transformEventData, isObject, FILE_EVENT, FILE_USER_PROPERTIES, FILE_CLEAR_USER_PROPERTIES } from './shared'

let debug = false

export const setDebug = value => {
    debug = !!value
}

//====================================================================================================
// Send
// Can be a single event object, or array of events
//====================================================================================================
export const send = event => {
    const data = transformEventData(event)

    // Generate a unique filename
    const filename = FILE_EVENT + (Math.floor(Math.random() * 10000000000000000))
    outbox.enqueue(filename, encode(data)).then(() => {
        debug && console.log(`GA4: File ${filename} transferred successfully.`)
    }).catch(function (error) {
        debug && console.log(`GA4: File ${filename} failed to transfer.`)
    })
}

//====================================================================================================
// Extend user properties. Keys previously used will be overwritten. Companion persists these in local storage
//====================================================================================================
export const setUserProperties = userProperties => {
    if (!isObject(userProperties)) {
        console.log('GA4: Provided user properties are not in object form')
        return
    }

    // Generate a unique filename
    const filename = FILE_USER_PROPERTIES + (Math.floor(Math.random() * 10000000000000000))
    outbox.enqueue(filename, encode(userProperties)).then(() => {
        debug && console.log(`GA4: File ${filename} transferred successfully.`)
    }).catch(function (error) {
        debug && console.log(`GA4: File ${filename} failed to transfer.`)
    })
}

//====================================================================================================
// Clear all previously stored user properties
//====================================================================================================
export const clearUserProperties = () => {
    const filename = FILE_CLEAR_USER_PROPERTIES + (Math.floor(Math.random() * 10000000000000000))
    outbox.enqueue(filename, encode('')).then(() => {
        debug && console.log(`GA4: File ${filename} transferred successfully.`)
    }).catch(function (error) {
        debug && console.log(`GA4: File ${filename} failed to transfer.`)
    })
}

// If invoking, ensure you're invoking at the top of your 'app' right after importing the module.
export const sendLoadAndDisplayOnEvents = value => {
    if (!!value === false) {
        return
    }

    // Send an event on load
    send({
        name: 'load',
    })

    // Send an event each time the display turns on
    display.addEventListener('change', () => {
        if (display.on) {
            send({
                name: 'display_on',
            })
        }
    })

    // Send an event on unload
    appbit.addEventListener('unload', () => {
        send({
            name: 'unload',
        })
    })
}

const exportable = {
    sendLoadAndDisplayOnEvents,
    send,
    setDebug,
    setUserProperties,
    clearUserProperties,
}

export default exportable
