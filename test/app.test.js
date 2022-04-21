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

    describe('send', () => {
        const outboxSpy = sinon.spy(fakeDeps['file-transfer'].outbox)

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
})
