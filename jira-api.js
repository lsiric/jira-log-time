function JiraAPI (baseUrl, apiExtension, username, password, jql) {

    var ACTIVE_REQUESTS = 0;

    var apiDefaults = {
        type: 'GET',
        url : baseUrl + apiExtension,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa(username + ':' + password)
        },
        responseType: 'json',
        data: ''
    };

    return {
        login : login,
        getIssue : getIssue,
        getIssues: getIssues,
        getIssueWorklog : getIssueWorklog,
        updateWorklog : updateWorklog
    };





    function login() {
        var url = '/user?username=' + username;
        var options = {
            headers: {
                'Authorization': 'Basic ' + btoa(username + ':' + password)
            }            
        }
        return ajaxWrapper(url, options);
    };

    function getIssue (id) {
        return ajaxWrapper('/issue/' + id);
    }

    function getIssues () {
        return ajaxWrapper('/search?jql=' + jql);
    }    

    function getIssueWorklog (id) {
        return ajaxWrapper('/issue/' + id + '/worklog');
    }

    function updateWorklog (id, timeSpent, started, comment) {
        var url = '/issue/' + id + '/worklog';
        var options = {
            type: 'POST',
            data: JSON.stringify({
                'started': started,
                'timeSpent': timeSpent,
				'comment': comment,
            })
        }
        return ajaxWrapper(url, options);
    }

    function ajaxWrapper (urlExtension, optionsOverrides) {

        // merge default and override options
        var options = extend(apiDefaults, optionsOverrides || {});

        // concat url
        options.url += urlExtension;

        // return promise
        return new Promise(function(resolve, reject) {

            var req = new XMLHttpRequest();

            // open request
            req.open(options.type, options.url, true);

            // set response type (json)
            req.responseType = options.responseType;

            // on load logic
            req.onload = function() {

                // consider all statuses between 200 and 400 successful
                if (req.status >= 200 && req.status < 400) {
                    resolve(req.response);
                }
                // all other ones are considered to be errors
                else {
                    //reject(req.response, req.status, req.statusText);
                    reject({
                        response: req.response, 
                        status: req.status, 
                        statusText: req.statusText
                    });
                }

                // keep the count of active XMLHttpRequest objects
                if (!(--ACTIVE_REQUESTS)) {

                    //if it's 0 dispatch a global event
                    dispatchEvent('jiraStop', document);
                }

            };

            // Unpredicted error
            req.onerror = function() {
                reject({
                    response: undefined, 
                    status: undefined, 
                    statusText: 'Unknown Error'
                });
                dispatchEvent('jiraError', document);
            };

            // set all headers
            for(header in options.headers){
                req.setRequestHeader(header, options.headers[header]);
            }

            // send the request
            req.send(options.data);

            // increment the count of active XMLHttpRequest objects
            if (ACTIVE_REQUESTS++ === 0 ) {

                // if it's the first one in the queue, dispatch a global event
                dispatchEvent('jiraStart', document);
            }

        });

    }



    /*
        Helper functions
    */
    // Event dispatcher
    function dispatchEvent (name, element) {
        var event = new Event(name);
        element.dispatchEvent(event);
    }

    // Simple extend function
    function extend (target, overrides) {

        // new empty object
        var extended = Object.create(target);

        // copy all properties from default
        Object.keys(target).map(function (prop) {
            extended[prop] = target[prop];
        });

        // iterate through overrides
        Object.keys(overrides).map(function (prop) {

            // if the attribute is an object, extend it too
            if(typeof overrides[prop] === 'object'){
                extended[prop] = extend(extended[prop], overrides[prop]);
            }
            // otherwise just assign value to the extended object
            else{
                extended[prop] = overrides[prop];
            }
        });

        return extended;

    };

}
