import { me as appbit } from 'appbit'
import { display } from 'display'
import { encode } from 'cbor'
import { outbox } from 'file-transfer'
import shared from './shared'

let debug = false

const setDebug = value => {
    debug = !!value
}

//====================================================================================================
// Send
// Can be a single event object, or array of events
//====================================================================================================
const send = event => {
    const data = shared.transformData(event)

    // Generate a unique filename
    const filename = '_google_analytics4_' + (Math.floor(Math.random() * 10000000000000000))
    // Enqueue the file
    outbox.enqueue(filename, encode(data)).then(() => {
        debug && console.log(`File: ${filename} transferred successfully.`)
    }).catch(function (error) {
        debug && console.log(`File: ${filename} failed to transfer.`)
    })
}

// If invoking, ensure you're invoking at the top of your 'app' right after importing the module.
const sendLoadAndDisplayOnEvents = value => {
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

const analytics = {
    sendLoadAndDisplayOnEvents,
    send,
    setDebug,
}

export default analytics
