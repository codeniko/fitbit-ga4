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
            getUserProperties: () => ({}),
            setUserProperties: () => {},
            clearUserProperties: () => {},
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

        it('should include user properties if set in storage', async () => {
            const fetchSpy = sinon.spy()
            const storageStubs = {
                getOrGenerateClientId: () => 'cid',
                getMeasurementId: () => 'mid',
                getApiSecret: () => 'secret',
                getUserProperties: sinon.stub().returns({ existing1: 'value1', existing2: true }),
                getDebug: () => false,
            }
            const module = loadWithInjectedDependencies({
                './fetch-wrapper': { default: fetchSpy },
                './local-storage': storageStubs,
            })
            module.send({ name: 'eventname' })
            assert.isTrue(storageStubs.getUserProperties.called)
            assert(fetchSpy.args[0][0] === `https://www.google-analytics.com/mp/collect?measurement_id=mid&api_secret=secret`)
            assert.deepEqual(fetchSpy.args[0][1], {
                method: 'POST',
                body: '{"client_id":"cid","events":[{"name":"eventname"}],"timestamp_micros":1650223688019000,"user_properties":{"existing1":{"value":"value1"},"existing2":{"value":true}}}'
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
                getUserProperties: () => ({}),
                setUserProperties: () => {},
                clearUserProperties: () => {},
                getDebug: sinon.stub().returns(false),
                setDebug: sinon.spy(),
            }
            const addEventListenerSpy = sinon.spy()

            const module = loadWithInjectedDependencies({
                './local-storage': storageStubs,
            })

            module.configure({
                measurementId: 'testmid',
                apiSecret: 'testsecret',
                debug: true,
                autoFileTransferProcessing: false,
            })

            assert.equal(storageStubs.setMeasurementId.args[0][0], 'testmid')
            assert.equal(storageStubs.setApiSecret.args[0][0], 'testsecret')
            assert.equal(storageStubs.setDebug.args[0][0], true)
            assert.isFalse(addEventListenerSpy.calledOnce)
        })

        it('should process and send GA data from app after configure if auto processing file transfers', async () => {
            getClock().restore()
            const fetchSpy = sinon.spy()
            const inboxPopStub = sinon.stub()
            const addEventListenerSpy = sinon.spy()
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
                        addEventListener: addEventListenerSpy,
                    }
                },
            })

            module.configure({
                measurementId: 'mid',
                apiSecret: 'secret',
            })
            await sleep(10) // there is an async buried internally which we can't await from the tests

            assert(fetchSpy.args[0][0] === `https://www.google-analytics.com/mp/collect?measurement_id=mid&api_secret=secret`)
            assert.deepEqual(fetchSpy.args[0][1], {
                method: 'POST',
                body: '{"client_id":"cid","events":[{"name":"eventname123456"}],"timestamp_micros":123456000}'
            })
            assert.isTrue(addEventListenerSpy.calledOnce)
            assert.equal(addEventListenerSpy.args[0][0], 'newfile')

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
            await sleep(10) // there is an async buried internally which we can't await from the tests

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

        it('should not consume files transferred from app that did not originate from us', async () => {
            getClock().restore()

            const cborSpy = sinon.spy()
            const inboxPopStub = sinon.stub()
            inboxPopStub.onCall(0).returns(Promise.resolve({
                cbor: cborSpy,
                name: 'some_unknown_file',
            }))
            inboxPopStub.onCall(1).returns(Promise.resolve(null))

            const module = loadWithInjectedDependencies({
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
            await sleep(10) // there is an async buried internally which we can't await from the tests

            assert.isFalse(cborSpy.called)

            useFakeClock()
        })

        it('should not set file transfer listener or process all files if configured to disable autoFileTransferProcessing', async () => {
            getClock().restore()

            const cborSpy = sinon.spy()
            const inboxPopStub = sinon.stub()
            const eventListenerSpy = sinon.spy()
            inboxPopStub.onCall(0).returns(Promise.resolve({
                cbor: cborSpy,
                name: '_google_analytics4_1234',
            }))
            inboxPopStub.onCall(1).returns(Promise.resolve(null))

            const module = loadWithInjectedDependencies({
                'file-transfer': {
                    inbox: {
                        pop: inboxPopStub,
                        addEventListener: eventListenerSpy
                    }
                },
            })

            module.configure({
                measurementId: 'mid',
                apiSecret: 'secret',
                autoFileTransferProcessing: false,
            })
            await sleep(10) // there is an async buried internally which we can't await from the tests

            assert.isFalse(inboxPopStub.called)
            assert.isFalse(eventListenerSpy.called)
            assert.isFalse(cborSpy.called)

            useFakeClock()
        })
    })

    describe('user properties', () => {
        it('should be able to clear user properties from storage', async () => {
            const storageStubs = {
                clearUserProperties: sinon.spy(),
            }

            const module = loadWithInjectedDependencies({
                './local-storage': storageStubs
            })

            module.clearUserProperties()

            assert.isTrue(storageStubs.clearUserProperties.calledOnce)
        })

        it('should be able to set and appending to existing user properties', async () => {
            const storageStubs = {
                getUserProperties: sinon.stub().returns({ existing: 'value' }),
                setUserProperties: sinon.spy(),
                getDebug: sinon.stub().returns(false),
            }

            const module = loadWithInjectedDependencies({
                './local-storage': storageStubs
            })

            module.setUserProperties({
                newProp1: 123,
                newProp2: 'value1234',
            })

            assert.isTrue(storageStubs.getUserProperties.calledOnce) // should retrieve existing user props
            assert.isTrue(storageStubs.setUserProperties.calledOnce)
            assert.deepEqual(storageStubs.setUserProperties.args[0][0], {
                existing: 'value',
                newProp1: '123',
                newProp2: 'value1234',
            })
        })

        it('should retrieve existing user properties from storage', async () => {
            const storageStubs = {
                getUserProperties: sinon.stub().returns({ existing: 'value' }),
                getDebug: sinon.stub().returns(false),
            }

            const module = loadWithInjectedDependencies({
                './local-storage': storageStubs
            })

            const result = module.getUserProperties()

            assert.isTrue(storageStubs.getUserProperties.calledOnce) // should retrieve existing user props
            assert.deepEqual(result, {
                existing: 'value',
            })
        })
    })

    describe('processFileTransfer', () => {

        it('should not process a file thats not one of ours', async () => {
            const cborSpy = sinon.spy()
            const module = loadWithInjectedDependencies({})

            const result = await module.processFileTransfer({
                cbor: cborSpy,
                name: 'unknown_file_name',
            })

            assert.isFalse(cborSpy.called)
            assert.isFalse(result)
        })

        it('should process and send GA4 event data from file transfer', async () => {
            const fetchSpy = sinon.spy()
            const module = loadWithInjectedDependencies({
                './fetch-wrapper': { default: fetchSpy },
            })

            const result = await module.processFileTransfer({
                cbor: () => Promise.resolve({
                    timestamp: 123456,
                    events: [{ name: 'eventname123456'}]
                }),
                name: '_google_analytics4_123456',
            })

            assert(fetchSpy.args[0][0] === `https://www.google-analytics.com/mp/collect?measurement_id=mid&api_secret=secret`)
            assert.deepEqual(fetchSpy.args[0][1], {
                method: 'POST',
                body: '{"client_id":"cid","events":[{"name":"eventname123456"}],"timestamp_micros":123456000}'
            })
            assert.isTrue(result)
        })

        it('should clear user properties from file', async () => {
            const storageStubs = {
                getOrGenerateClientId: sinon.stub().returns('cid'),
                getMeasurementId: sinon.stub().returns('mid'),
                setMeasurementId: sinon.spy(),
                getApiSecret: sinon.stub().returns('secret'),
                setApiSecret: sinon.spy(),
                getUserProperties: () => ({}),
                setUserProperties: sinon.spy(),
                clearUserProperties: sinon.spy(),
                getDebug: sinon.stub().returns(false),
                setDebug: sinon.spy(),
            }

            const module = loadWithInjectedDependencies({
                './local-storage': storageStubs
            })

            const result = await module.processFileTransfer({
                cbor: () => Promise.resolve(''),
                name: '_ga4_clearuserprops_123',
            })

            assert.isTrue(result)
            assert.isTrue(storageStubs.clearUserProperties.calledOnce)
        })

        it('should set and append user properties from file', async () => {
            const storageStubs = {
                getOrGenerateClientId: sinon.stub().returns('cid'),
                getMeasurementId: sinon.stub().returns('mid'),
                setMeasurementId: sinon.spy(),
                getApiSecret: sinon.stub().returns('secret'),
                setApiSecret: sinon.spy(),
                getUserProperties: () => ({ existingProp: 'existingvalue' }),
                setUserProperties: sinon.spy(),
                clearUserProperties: sinon.spy(),
                getDebug: sinon.stub().returns(false),
                setDebug: sinon.spy(),
            }

            const module = loadWithInjectedDependencies({
                './local-storage': storageStubs
            })
            const result = await module.processFileTransfer({
                cbor: () => Promise.resolve({
                    userProps1: 123,
                    userProps2: 'test',
                }),
                name: '_ga4_userprops_123',
            })

            assert.isFalse(storageStubs.clearUserProperties.called)
            assert.isTrue(storageStubs.setUserProperties.calledOnce)
            assert.deepEqual(storageStubs.setUserProperties.args[0][0], {
                existingProp: 'existingvalue', // existing user props need to remain
                userProps1: '123', // normalized to string
                userProps2: 'test',
            })
            assert.isTrue(result)
        })
    })
})
