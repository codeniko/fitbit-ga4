export const transformEventData = event => {
    const data = {
        timestamp: Date.now(),
        events: Array.isArray(event) ? event : [ event ],
    }

    return data
}

export const isObject = obj => Object.prototype.toString.call(obj) === '[object Object]'

export const FILE_EVENT = '_google_analytics4_'
export const FILE_USER_PROPERTIES = '_ga4_userprops_'
export const FILE_CLEAR_USER_PROPERTIES = '_ga4_clearuserprops_'

const exportable = {
    transformEventData,
    isObject,
    FILE_EVENT,
    FILE_USER_PROPERTIES,
    FILE_CLEAR_USER_PROPERTIES,
}

export default exportable
