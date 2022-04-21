// This file should be executed before any of the tests

const sinon = require('sinon')

// set constant global timestamp
const timestamp = 1650223688019
let _clock
const getClock = () => _clock
const useFakeClock = () => {
    _clock = sinon.useFakeTimers(timestamp)
}
useFakeClock()


// console.log = () => {}
console.warn = () => {}

module.exports = {
    timestamp,
    getClock,
    useFakeClock,
}
