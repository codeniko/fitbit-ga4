// fibit sdk set a global fetch. This is a wrapper so we can stub it for unit tests
export default (endpoint, options) => {
    fetch(endpoint, options)
}
