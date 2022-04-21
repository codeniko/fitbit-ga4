'use strict'

const sinon = require('sinon')
const proxyquire = require('proxyquire').noCallThru()
const { assert } = require('chai')
const { timestamp, getClock, useFakeClock } = require('./testSetup')

describe('Companion', () => {
    const modulePath = '../companion.js'

    const fakeDeps = {
        './fetch-wrapper': () => { console.log('test fetch') },
        './local-storage': {
            getOrGenerateClientId: () => 'cid',
            getMeasurementId: () => 'mid',
            setMeasurementId: () => {},
            getApiSecret: () => 'secret',
            setApiSecret: () => {},
            getDebug: () => false,
            setDebug: () => {},
        },
        'file-transfer': {
            inbox: {
                pop: () => Promise.resolve({
                    cbor: () => Promise.resolve({}),
                    name: '_google_analytics4_123',
                }),
                addEventListener: () => {},
            },
        },
    }

    function loadWithInjectedDependencies(otherDeps) {
        return proxyquire.load(modulePath, Object.assign({}, fakeDeps, otherDeps))
    }

    describe('send', () => {
        it('should send single event', async () => {
            const fetchSpy = sinon.spy()
            const module = loadWithInjectedDependencies({
                './fetch-wrapper': { default: fetchSpy },
            })
            module.send({ name: 'eventname' })
            assert(fetchSpy.args[0][0] === `https://www.google-analytics.com/mp/collect?measurement_id=mid&api_secret=secret`)
            assert.deepEqual(fetchSpy.args[0][1], {
                method: 'POST',
                body: '{"client_id":"cid","events":[{"name":"eventname"}],"timestamp_micros":1650223688019000}'
            })
        })


        it('should enqueue single event with params', async () => {
            const fetchSpy = sinon.spy()
            const module = loadWithInjectedDependencies({
                './fetch-wrapper': { default: fetchSpy },
            })

            module.send({
                name: 'eventname',
                params: { param1: 'value1', param2: 'value2' },
            })

            assert(fetchSpy.args[0][0] === `https://www.google-analytics.com/mp/collect?measurement_id=mid&api_secret=secret`)
            assert.deepEqual(fetchSpy.args[0][1], {
                method: 'POST',
                body: '{"client_id":"cid","events":[{"name":"eventname","params":{"param1":"value1","param2":"value2"}}],"timestamp_micros":1650223688019000}'
            })
        })

        it('should enqueue multiple events with mixed params', async () => {
            const fetchSpy = sinon.spy()
            const module = loadWithInjectedDependencies({
                './fetch-wrapper': { default: fetchSpy },
            })

            module.send([ {
                name: 'eventname',
                params: { param1: 'value1', param2: 'value2' },
            }, {
                name: 'eventname2',
            } ])

            assert(fetchSpy.args[0][0] === `https://www.google-analytics.com/mp/collect?measurement_id=mid&api_secret=secret`)
            assert.deepEqual(fetchSpy.args[0][1], {
                method: 'POST',
                body: '{"client_id":"cid","events":[{"name":"eventname","params":{"param1":"value1","param2":"value2"}},{"name":"eventname2"}],"timestamp_micros":1650223688019000}'
            })
        })

        it('should handle 2 events sent back to back', async () => {
            const fetchSpy = sinon.spy()
            const module = loadWithInjectedDependencies({
                './fetch-wrapper': { default: fetchSpy },
            })

            module.send({ name: 'eventname1' })
            module.send({ name: 'eventname2' })

            assert(fetchSpy.args[0][0] === `https://www.google-analytics.com/mp/collect?measurement_id=mid&api_secret=secret`)
            assert.deepEqual(fetchSpy.args[0][1], {
                method: 'POST',
                body: '{"client_id":"cid","events":[{"name":"eventname1"}],"timestamp_micros":1650223688019000}'
            })
            assert.deepEqual(fetchSpy.args[1][1], {
                method: 'POST',
                body: '{"client_id":"cid","events":[{"name":"eventname2"}],"timestamp_micros":1650223688019000}'
            })
        })

    })

    describe('configure', () => {

        const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

        it('should update measurementId, secret, and debug in storage', async () => {
            const storageStubs = {
                getOrGenerateClientId: sinon.stub().returns('cid'),
                getMeasurementId: sinon.stub().returns('mid'),
                setMeasurementId: sinon.spy(),
                getApiSecret: sinon.stub().returns('secret'),
                setApiSecret: sinon.spy(),
                getDebug: sinon.stub().returns(false),
                setDebug: sinon.spy(),
            }
            const addEventListenerSpy = sinon.spy()

            const module = loadWithInjectedDependencies({
                'file-transfer': {
                    inbox: {
                        pop: () => Promise.resolve(null),
                        addEventListener: addEventListenerSpy
                    }
                },
                './local-storage': storageStubs,
            })

            module.configure({
                measurementId: 'testmid',
                apiSecret: 'testsecret',
                debug: true,
            })

            assert.equal(storageStubs.setMeasurementId.args[0][0], 'testmid')
            assert.equal(storageStubs.setApiSecret.args[0][0], 'testsecret')
            assert.equal(storageStubs.setDebug.args[0][0], true)
            assert.equal(addEventListenerSpy.args[0][0], 'newfile')
        })

        it('should process and send GA data from app after configure', async () => {
            getClock().restore()
            const fetchSpy = sinon.spy()
            const inboxPopStub = sinon.stub()
            inboxPopStub.onCall(0).returns(Promise.resolve({
                cbor: () => Promise.resolve({
                    timestamp: 123456,
                    events: [{ name: 'eventname123456'}]
                }),
                name: '_google_analytics4_123456',
            }))
            inboxPopStub.onCall(1).returns(Promise.resolve(null))

            const module = loadWithInjectedDependencies({
                './fetch-wrapper': { default: fetchSpy },
                'file-transfer': {
                    inbox: {
                        pop: inboxPopStub,
                        addEventListener: sinon.spy()
                    }
                },
            })

            module.configure({
                measurementId: 'mid',
                apiSecret: 'secret',
            })
            await sleep(30) // there is an async buried internally which we can't await from the tests

            assert(fetchSpy.args[0][0] === `https://www.google-analytics.com/mp/collect?measurement_id=mid&api_secret=secret`)
            assert.deepEqual(fetchSpy.args[0][1], {
                method: 'POST',
                body: '{"client_id":"cid","events":[{"name":"eventname123456"}],"timestamp_micros":123456000}'
            })

            useFakeClock()
        })

        it('should process and send multiple GA data from app after configure', async () => {
            getClock().restore()
            const fetchSpy = sinon.spy()
            const inboxPopStub = sinon.stub()
            inboxPopStub.onCall(0).returns(Promise.resolve({
                cbor: () => Promise.resolve({
                    timestamp: 123456,
                    events: [{ name: 'eventname123456'}]
                }),
                name: '_google_analytics4_123456',
            }))
            inboxPopStub.onCall(1).returns(Promise.resolve({
                cbor: () => Promise.resolve({
                    timestamp: 1234567,
                    events: [{ name: 'eventname1234567'}]
                }),
                name: '_google_analytics4_1234567',
            }))
            inboxPopStub.onCall(2).returns(Promise.resolve(null))

            const module = loadWithInjectedDependencies({
                './fetch-wrapper': { default: fetchSpy },
                'file-transfer': {
                    inbox: {
                        pop: inboxPopStub,
                        addEventListener: sinon.spy()
                    }
                },
            })

            module.configure({
                measurementId: 'mid',
                apiSecret: 'secret',
            })
            await sleep(30) // there is an async buried internally which we can't await from the tests

            assert(fetchSpy.args[0][0] === `https://www.google-analytics.com/mp/collect?measurement_id=mid&api_secret=secret`)
            assert.deepEqual(fetchSpy.args[0][1], {
                method: 'POST',
                body: '{"client_id":"cid","events":[{"name":"eventname123456"}],"timestamp_micros":123456000}'
            })
            assert.deepEqual(fetchSpy.args[1][1], {
                method: 'POST',
                body: '{"client_id":"cid","events":[{"name":"eventname1234567"}],"timestamp_micros":1234567000}'
            })

            useFakeClock()
        })
    })
})
