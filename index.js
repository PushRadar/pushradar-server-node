const got = require('got');

function PushRadar(secretKey) {
    this.version = '3.1.0';
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

    this.auth = (channelName, socketID, callback) => {
        if (typeof channelName !== 'string') {
            throw new Error('Channel name must be a string.');
        }

        if (channelName.trim() === '') {
            throw new Error('Channel name empty. Please provide a channel name.');
        }

        if (!(channelName.lastIndexOf('private-', 0) === 0 || channelName.lastIndexOf('presence-', 0) === 0)) {
            throw new Error('Channel authentication can only be used with private and presence channels.');
        }

        if (typeof socketID !== 'string') {
            throw new Error('Socket ID must be a string.');
        }

        if (socketID.trim() === '') {
            throw new Error('Socket ID empty. Please pass through a socket ID.');
        }

        ((channelNameInner, socketIDInner, callbackInner) => {
            this._doHTTPRequest('GET', this.apiEndpoint + "/channels/auth?channel=" + encodeURIComponent(channelNameInner) +
                "&socketID=" + encodeURIComponent(socketIDInner), {}, (err, response) => {
                if (err || response.status !== 200) {
                    return callbackInner(err, 'There was a problem receiving a channel authentication token. Server returned: ' + err.response.body);
                }

                return callbackInner(null, JSON.parse(response.body));
            });
        })(channelName, socketID, callback);
    }

    this.broadcast = (channelName, data, callback = undefined) => {
        if (typeof channelName !== 'string') {
            throw new Error('Channel name must be a string.');
        }

        if (channelName.trim() === '') {
            throw new Error('Channel name empty. Please provide a channel name.');
        }

        this._validateChannelName(channelName);

        ((channelNameInner, dataInner, callbackInner) => {
            this._doHTTPRequest('POST', this.apiEndpoint + "/broadcasts", {
                channel: channelNameInner,
                data: JSON.stringify(dataInner)
            }, (err, response) => {
                if (typeof callbackInner !== 'undefined') {
                    if (err || response.status !== 200) {
                        return callbackInner(err, 'An error occurred while calling the API. Server returned: ' + err.response.body);
                    }

                    return callbackInner(null, true);
                }
            });
        })(channelName, data, callback);
    }

    this.registerClientData = (socketID, clientData) => {
        if (typeof socketID !== 'string') {
            throw new Error('Socket ID must be a string.');
        }

        if (socketID.trim() === '') {
            throw new Error('Socket ID empty. Please pass through a socket ID.');
        }

        ((socketIDInner, clientDataInner) => {
            this._doHTTPRequest('POST', this.apiEndpoint + "/client-data", {
                socketID: socketIDInner,
                clientData: JSON.stringify(clientDataInner)
            }, (err, response) => {
            });
        })(socketID, clientData);
    }

    if (typeof secretKey !== 'string') {
        throw new Error("Secret key must be a string.");
    }

    if (!secretKey || !/^sk_/.test(secretKey)) {
        throw new Error("Please provide your PushRadar secret key. You can find it on the API page of your dashboard.");
    }

    this.secretKey = secretKey;
}

module.exports = function (secretKey) {
    return new PushRadar(secretKey);
}
