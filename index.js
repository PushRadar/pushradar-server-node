const got = require('got');

function PushRadar(secretKey) {
    this.version = '3.0.0-alpha.1';
    this.apiEndpoint = 'https://api.pushradar.com/v3';

    this._validateChannelName = (channelName) => {
        if (!/^[-a-zA-Z0-9_=@,.;]+$/.test(channelName)) {
            throw new Error('Invalid channel name: ' + channelName + '. Channel names cannot contain spaces, and must consist of only upper and lowercase ' +
                'letters, numbers, underscores, equals characters, @ characters, commas, periods, semicolons, and hyphens (A-Za-z0-9_=@,.;-).');
        }
    }

    this._doHTTPRequest = (method, url, data, callback) => {
        got(Object.assign({
            method: method,
            url: url,
            headers: {
                'Authorization': 'Bearer ' + this.secretKey,
                'X-PushRadar-Library': 'pushradar-server-node ' + this.version
            }
        }, method.toLowerCase() === 'post' ? {
            json: data
        } : {})).then(response => {
            callback(null, {body: response.body, status: response.statusCode});
        }).catch(error => {
            callback(error, null);
        });
    }

    this.auth = (channelName, callback) => {
        if (channelName.trim() === '') {
            throw new Error('Channel name empty. Please provide a channel name.');
        }

        if (channelName.lastIndexOf('private-', 0) !== 0) {
            throw new Error('Channel authentication can only be used with private channels.');
        }

        ((channelNameInner, callbackInner) => {
            this._doHTTPRequest('GET', this.apiEndpoint + "/channels/auth?channel=" + encodeURIComponent(channelNameInner.trim()), {}, (err, response) => {
                if (err) {
                    return callbackInner(err, JSON.parse(err.response.body));
                }

                if (response.status === 200) {
                    return callbackInner(null, JSON.parse(response.body));
                } else {
                    return callbackInner(err, JSON.parse(err.response.body));
                }
            });
        })(channelName, callback);
    }

    this.broadcast = (channelName, data, callback) => {
        if (channelName.trim() === '') {
            throw new Error('Channel name empty. Please provide a channel name.');
        }

        this._validateChannelName(channelName);

        ((channelNameInner, dataInner, callbackInner) => {
            this._doHTTPRequest('POST', this.apiEndpoint + "/broadcasts", {
                channel: channelNameInner.trim(),
                data: dataInner
            }, (err, response) => {
                if (typeof callbackInner !== 'undefined') {
                    if (err) {
                        return callbackInner(err, JSON.parse(err.response.body));
                    }

                    if (response.status === 200) {
                        return callbackInner(null, JSON.parse(response.body));
                    } else {
                        return callbackInner(err, JSON.parse(err.response.body));
                    }
                }
            });
        })(channelName, data, callback);
    }

    if (!secretKey || !/^sk_/.test(secretKey)) {
        throw new Error("Please provide your PushRadar secret key. You can find it on the API page of your dashboard.");
    }

    this.secretKey = secretKey;
}

module.exports = function (secretKey) {
    return new PushRadar(secretKey);
}
