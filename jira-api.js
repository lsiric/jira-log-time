function JiraAPI (baseUrl, apiExtension, username, password) {

    var apiDefaults = {
        baseUrl : baseUrl,
        apiExtension: apiExtension,
        username: username,
        password: password
    };

    return {
        login : login,
        getIssue : getIssue,
        getAssignedIssues: getAssignedIssues,
        getIssueWorklog : getIssueWorklog,
        updateWorklog : updateWorklog
    };



    function login() {

        return $.ajax({
            type: 'GET',
            url: baseUrl + apiExtension + '/user?username=' + username,
            headers: {
                'Authorization': 'Basic ' + btoa(username + ':' + password)
            },
            contentType: 'application/json',
            dataType: 'json'
        });

    };

    function getIssue (id) {

        return $.ajax({
            type: 'GET',
            url: baseUrl + apiExtension + '/issue/' + id,
            headers: {
                'Authorization': 'Basic ' + btoa(username + ':' + password)
            },
            contentType: 'application/json',
            dataType: 'json'
        });

    }

    function getAssignedIssues () {

        return $.ajax({
            type: 'GET',
            url: baseUrl + apiExtension + '/search?jql=assignee=' + username.replace('@', '\\u0040'),
            headers: {
                'Content-Type': 'application/json'
            },
            contentType: 'application/json',
            dataType: 'json'
        });

    }    

    function getIssueWorklog (id) {

        return $.ajax({
            type: 'GET',
            url: baseUrl + apiExtension + '/issue/' + id + '/worklog',
            headers: {
                'Content-Type': 'application/json'
            },
            contentType: 'application/json',
            dataType: 'json'
        });

    }

    function updateWorklog (id, timeSpent) {

        var parameters = {
            fields : {
                "started": new Date().toISOString().replace('Z', '+0530'), // TODO: Problems with the timezone, investigate
                "timeSpent": timeSpent
            }
        };

        return $.ajax({
            type: 'POST',
            url: 'http://192.168.99.100:32768/rest/api/2/issue/' + id + '/worklog',
            headers: {
               // 'Authorization': 'Basic ' + btoa(username + ':' + password),
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(parameters.fields),
            contentType: 'application/json',
            dataType: 'json'
        });

    }

}