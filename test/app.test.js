'use strict'

const sinon = require('sinon')
const proxyquire = require('proxyquire').noCallThru()
const { assert } = require('chai')
const { timestamp } = require('./testSetup')

describe('App', () => {
    const modulePath = '../app.js'

    const fakeDeps = {
        display: {},
        cbor: { encode: a => a },
        appbit: { me: {} },
        'file-transfer': { outbox: { enqueue: (a, b) => Promise.resolve() } },
    }

    function loadWithInjectedDependencies(otherDeps) {
        return proxyquire.load(modulePath, Object.assign({}, fakeDeps, otherDeps))
    }

    const outboxSpy = sinon.spy(fakeDeps['file-transfer'].outbox)

    describe('send', () => {
        beforeEach(function () {
            outboxSpy.enqueue.resetHistory()
        })

        it('should enqueue single event', async () => {
            const module = loadWithInjectedDependencies({ 'file-transfer': { outbox: outboxSpy } })

            module.send({ name: 'eventname' })
            assert(outboxSpy.enqueue.args[0][0].startsWith('_google_analytics4_'))
            assert.deepEqual(outboxSpy.enqueue.args[0][1], {
                events: [ { name: 'eventname' } ],
                timestamp: 1650223688019,
            })
        })

        it('should enqueue single event with params', async () => {
            const module = loadWithInjectedDependencies({ 'file-transfer': { outbox: outboxSpy } })

            module.send({
                name: 'eventname',
                params: { param1: 'value1', param2: 'value2' },
            })
            assert(outboxSpy.enqueue.args[0][0].startsWith('_google_analytics4_'))
            assert.deepEqual(outboxSpy.enqueue.args[0][1], {
                events: [ {
                    name: 'eventname',
                    params: { param1: 'value1', param2: 'value2' },
                } ],
                timestamp: 1650223688019,
            })
        })

        it('should enqueue multiple events with mixed params', async () => {
            const module = loadWithInjectedDependencies({ 'file-transfer': { outbox: outboxSpy } })

            module.send([{
                name: 'eventname',
                params: { param1: 'value1', param2: 'value2' },
            },{
                name: 'eventname2',
            }])
            assert(outboxSpy.enqueue.args[0][0].startsWith('_google_analytics4_'))
            assert.deepEqual(outboxSpy.enqueue.args[0][1], {
                events: [ {
                    name: 'eventname',
                    params: { param1: 'value1', param2: 'value2' },
                }, {
                    name: 'eventname2'
                } ],
                timestamp: 1650223688019,
            })
        })
    })

    describe('user properties', () => {
        beforeEach(function () {
            outboxSpy.enqueue.resetHistory()
        })

        it('should enqueue to clear user properties', async () => {
            const module = loadWithInjectedDependencies({ 'file-transfer': { outbox: outboxSpy } })

            module.clearUserProperties()
            assert(outboxSpy.enqueue.args[0][0].startsWith('_ga4_clearuserprops_'))
        })

        it('should enqueue to set user properties', async () => {
            const module = loadWithInjectedDependencies({ 'file-transfer': { outbox: outboxSpy } })

            module.setUserProperties({
                userProp1: 'value1',
                userProp2: 'value2',
            })
            assert(outboxSpy.enqueue.args[0][0].startsWith('_ga4_userprops_'))
            assert.deepEqual(outboxSpy.enqueue.args[0][1], {
                userProp1: 'value1',
                userProp2: 'value2',
            })
        })
    })
})
