(function () {

    document.addEventListener('DOMContentLoaded', onDOMContentLoaded, false);

    function onDOMContentLoaded () {

        var JIRA = null;

        chrome.storage.sync.get({
            username: '',
            password: '',
            description: '',
            baseUrl: '',
            apiExtension: '',
            jql: ''
        }, 
        loadOptionsSuccess);


        function loadOptionsSuccess (options) {

            var error = '';

            if(!options.username){
                error += 'Missing username';
            }
            if(!options.password){
                error += '; Missing password';
            }
            if(!options.baseUrl){
                error += '; Missing base URL';
            }
            if(!options.apiExtension){
                error += '; Missing API extension';
            }

            if(error){
                errorMessage(error);
            }else{

                JIRA = JiraAPI(options.baseUrl, options.apiExtension, options.username, options.password, options.jql);

                initPlugin(options.description);

            }

        }

        function initPlugin (description) {

            JIRA.login()
            .success(onLoginSuccess)
            .error(genericResponseError);

            function onLoginSuccess () {

                JIRA.getAssignedIssues()
                .success(function (issuesResponse) {

                    var promises = [];

                    issuesResponse.issues.forEach(function (issue) {
                        promises.push(getWorklog(issue.key));
                    });

                    function getWorklog (id) {

                        return JIRA.getIssueWorklog(id)
                        .success(function (worklogResponse) {

                            issuesResponse.issues.forEach(function (issue) {
                                if(issue.key === id){
                                    issue.totalTime = sumWorklogs(worklogResponse.worklogs);
                                } 
                            });

                        })
                        .error(genericResponseError);

                    }
                    // when all worklogs are fetched, draw the table
                    $.when.apply($, promises)
                    .done(function () {

                        drawIssuesTable(description, issuesResponse.issues);
                        errorMessage('');

                    });

                })
                .error(genericResponseError);

            }

        }

        function drawIssuesTable (projectName, issues) {

            var table = document.createElement('table');

            addTableHeader(table, projectName);

            for (var i = 0; i < issues.length; i++) {

                var issue = issues[i];

                addTableRow(
                    table, 
                    issue.key,
                    issue.fields.summary,
                    issue.totalTime
                );

            };

            document.getElementById('issues').appendChild(table);

        }

        function addTableHeader (table, projectName) {

            var header = document.createElement('th');
            header.setAttribute('colspan', 3);
            var td = document.createElement('td');
            td.innerText = projectName;
            header.appendChild(td);
            table.appendChild(header);
            return table;

        }

        function addTableRow (table, id, summary, time) {

            var row = document.createElement('tr');
            var td1 = document.createElement('td');
            var td2 = document.createElement('td');
            var td3 = document.createElement('td');

            td1.innerText = id;
            td1.className = 'issue-id';

            td2.innerText = summary;
            td2.className = 'issue-summary';

            td3.innerText = time;
            td3.className = 'issue-total-time-spent';
            td3.setAttribute('data-issue-id', id);

            row.appendChild(td1);
            row.appendChild(td2);
            row.appendChild(td3);

            addTimeInput(row, id);
            addActionButton(row, id);

            table.appendChild(row);
            return table;

        }

        function addTimeInput (parent, issueId) {

            var td = document.createElement('td');
            
            var input = document.createElement('input');
            input.className = 'issue-time-input';
            input.setAttribute('data-issue-id', issueId);

            td.appendChild(input);
            parent.appendChild(td);
            
        }

        function addActionButton (parent, issueId) {

            var td = document.createElement('td');
            td.className = 'issue-actions';
            
            var button = document.createElement('button');
            button.setAttribute('data-issue-id', issueId);
            button.className = 'log-time-btn';
            button.innerText = 'Log Time';

            button.addEventListener('click', logTimeClick);

            td.appendChild(button);
            parent.appendChild(td);

        }

        function logTimeClick (evt) {

            // clear error messages
            errorMessage('');

            var issueId = evt.target.getAttribute('data-issue-id')
            var timeInput = document.querySelector('input[data-issue-id=' + issueId + ']');

            JIRA.updateWorklog(issueId, timeInput.value)
            .success(function (data) {
                refreshWorklog(issueId);
            })
            .error(genericResponseError);

        }

        function refreshWorklog (issueId) {

            JIRA.getIssueWorklog(issueId)
            .success(function (data) {
                var totalTimeSpent = document.querySelector('td[data-issue-id=' + issueId + ']');
                totalTimeSpent.innerText = sumWorklogs(data.worklogs);
            });

        }

        function sumWorklogs (worklogs) {

            var totalSeconds = worklogs.reduce(function(a, b){
                return {timeSpentSeconds: a.timeSpentSeconds + b.timeSpentSeconds}
            }, {timeSpentSeconds:0}).timeSpentSeconds;

            var totalWeeks = Math.floor(totalSeconds / 144000);
            totalSeconds = totalSeconds % 144000;
            var totalDays = Math.floor(totalSeconds / 28800);
            totalSeconds = totalSeconds % 28800;
            var totalHours = Math.floor(totalSeconds / 3600);
            totalSeconds = totalSeconds % 3600;
            var totalMinutes = Math.floor(totalSeconds / 60);

            return (totalWeeks ? totalWeeks + 'w' : '') + ' ' + (totalDays ? totalDays + 'd' : '') + ' ' + (totalHours ? totalHours + 'h' : '') + ' ' + (totalMinutes ? totalMinutes + 'min' : '');

        }

        function genericResponseError (error) {
            var msg = '';
            if(error.responseText){
                var resp = JSON.parse(error.responseText);
                msg = resp.errorMessages[0];
            }else{
                msg = error.statusText;
            }
            errorMessage(msg);

        }

        function errorMessage (message) {
            document.getElementById('error').innerText = message;
        }

    }
    
})(); 
