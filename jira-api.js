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
        getAssignedIssues: getAssignedIssues,
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

    function getAssignedIssues () {
        return ajaxWrapper('/search?jql=' + jql);
    }    

    function getIssueWorklog (id) {
        return ajaxWrapper('/issue/' + id + '/worklog');
    }

    function updateWorklog (id, timeSpent, date) {
        var url = '/issue/' + id + '/worklog';
        var options = {
            type: 'POST',
            data: JSON.stringify({
                "started": date.toISOString().replace('Z', '+0530'), // TODO: Problems with the timezone, investigate
                "timeSpent": timeSpent
            })
        }
        return ajaxWrapper(url, options);
    }

    function ajaxWrapper (urlExtension, optionsOverrides) {

        var options = extend(apiDefaults, optionsOverrides || {});

        options.url += urlExtension;

        return new Promise(function(resolve, reject) {

            var req = new XMLHttpRequest();

            req.open(options.type, options.url, true);

            req.responseType = options.responseType;

            req.onload = function() {
                if (req.status >= 200 && req.status < 400) {
                    resolve(req.response);
                }
                else {
                    reject(req.response, req.status, req.statusText);
                }

                if (!(--ACTIVE_REQUESTS)) {
                    dispatchEvent('jiraStop', document);
                }

            };

            req.onerror = function() {
                reject('Unknown Error');
                dispatchEvent('jiraError', document);
            };

            for(header in options.headers){
                req.setRequestHeader(header, options.headers[header]);
            }

            req.send(options.data);

            if (ACTIVE_REQUESTS++ === 0 ) {
                dispatchEvent('jiraStart', document);
            }

        });

    }

    // Helper functions
    function dispatchEvent (name, element) {
        var event = new Event(name);
        element.dispatchEvent(event);
    }

    // Simple extend function
    function extend (target, overrides) {

        var extended = Object.create(target);

        Object.keys(target).map(function (prop) {
            extended[prop] = target[prop];
        });

        Object.keys(overrides).map(function (prop) {

            if(typeof overrides[prop] === 'object'){
                extended[prop] = extend(extended[prop], overrides[prop]);
            }else{
                extended[prop] = overrides[prop];
            }
        });

        return extended;

    };

}
