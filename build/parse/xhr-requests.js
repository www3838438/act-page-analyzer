'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
const VALUABLE_CONTENT_TYPES = ['html', 'json'];

// attempt to parse JSON response, save error if parsing fails
async function parseJSONResponse(response) {
    let result;
    try {
        const json = await response.json();
        result = {
            valid: true,
            data: json
        };
    } catch (err) {
        // Parsing JSON failed
        result = {
            valid: false,
            error: err
        };
    }
    return result;
}

exports.default = async function parseResponse(response) {
    const result = {};
    result.status = response.status();
    result.headers = response.headers();

    // ignore body if request failed remove this optimization if you want to store
    // errors too
    if (Number(result.status || 200) > 300) {
        return result;
    }

    const contentType = result.headers['content-type'];
    const valueableType = VALUABLE_CONTENT_TYPES.filter(ct => contentType && contentType.indexOf(ct) !== -1);
    // ignore body if it's not important
    if (!valueableType.length) {
        result.ignore = true;
        return result;
    }

    result.ignore = false;

    try {
        if (contentType.indexOf('json') !== -1) {
            result.body = await parseJSONResponse(response);
        } else {
            result.body = await response.text();
        }
    } catch (err) {
        // Parsing BODY Failed, log error
        console.log(err);
        result.body = err;
    }
    return result;
};