const transformData = event => {
    const data = {
        timestamp: Date.now(),
        events: Array.isArray(event) ? event : [ event ],
    }

    return data
}

const exportable = {
    transformData,
}

module.exports = {
    ...exportable,
    default: exportable,
}
