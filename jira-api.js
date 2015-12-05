function JiraAPI (baseUrl, apiExtension, username, password, jql) {

    var apiDefaults = {
        type: 'GET',
        url : baseUrl + apiExtension,
        headers: {
            'Content-Type': 'application/json'
        },
        contentType: 'application/json',
        dataType: 'json'
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
        var options = $.extend({}, apiDefaults, optionsOverrides);
        options.url += urlExtension;
        return $.ajax(options);
    }

}
