document.addEventListener('DOMContentLoaded', onDOMContentLoaded, false);

function onDOMContentLoaded () {

    chrome.storage.sync.get({
        username: '',
        password: '',
        description: '',
        baseUrl: '',
        apiExtension: '',
        jql: ''
    }, 
    init);

    function init (options) {

        if(!options.username){
            return errorMessage('Missing username');
        }
        if(!options.password){
            return errorMessage('Missing password');
        }
        if(!options.baseUrl){
            return errorMessage('Missing base URL');
        }
        if(!options.apiExtension){
            return errorMessage('Missing API extension');
        }

        var JIRA = JiraAPI(options.baseUrl, options.apiExtension, options.username, options.password, options.jql);

        setupLoader();

        JIRA.login()
        .then(onLoginSuccess, genericResponseError);

        function onLoginError (error) {
            errorMessage('Login failed');
        }

        function onLoginSuccess () {

            JIRA.getAssignedIssues()
            .then(onFetchSuccess, genericResponseError);

            function onFetchSuccess (response) {

                var promises = [];

                var issues = response.issues;

                issues.forEach(function (issue) {
                    promises.push(getWorklog(issue.key, issues));
                });

                // when all worklogs are fetched, draw the table
                Promise.all(promises)
                .then(function () {

                    setProjectTitle(options.description);
                    drawIssuesTable(issues);

                });

            }

        }






        /*
            Worklog functions
        */

        function getWorklog (id, issues) {

            return JIRA.getIssueWorklog(id)
            .then(onWorklogFetchSuccess, genericResponseError);

            function onWorklogFetchSuccess (response) {

                var worklogs = response.worklogs;

                issues.forEach(function (issue) {
                    if(issue.key === id){
                        issue.totalTime = sumWorklogs(worklogs);
                    } 
                });

            }

        }

        // worklog sum in 'jira format'
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






        /*
            HTML interaction
        */
 
        function setProjectTitle (projectName) {
            document.getElementById('project-name').innerText = projectName;
        }

        function drawIssuesTable (issues) {

            var logTable = document.getElementById('jira-log-time-table');
            var tbody = buildHTML('tbody');

            issues.forEach(function (issue) {
                var row = generateLogTableRow(issue.key, issue.fields.summary, issue.totalTime);
                tbody.appendChild(row)
            });

            logTable.appendChild(tbody);

        }

        function generateLogTableRow (id, summary, time) {

            // Issue ID cell
            var idCell = buildHTML('td', id, {
                class: 'issue-id'
            });

            // Issue summary cell
            var summaryCell = buildHTML('td', summary, {
                class: 'issue-summary truncate'
            });

            // Issue total worklog sum
            var totalTimeCell = buildHTML('td', time, {
                class: 'issue-total-time-spent',
                'data-issue-id' : id
            });
            
            // Time input 
            var timeInput = buildHTML('input', null, {
                class: 'issue-time-input',
                'data-issue-id': id
            });
            
            // Time input cell
            var timeInputCell = buildHTML('td');
            timeInputCell.appendChild(timeInput);

            // Date input
            var dateInput = buildHTML('input', null, {
                type: 'date',
                class: 'log-date-input',
                value: new Date().toDateInputValue(),
                'data-issue-id': id
            });
            
            // Date input cell
            var dateInputCell = buildHTML('td');
            dateInputCell.appendChild(dateInput);

            var actionButton = buildHTML('input', null, {
                type: 'button',
                value: 'Log Time',
                class: 'log-time-btn',
                'data-issue-id': id
            });

            actionButton.addEventListener('click', logTimeClick);

            // Action button cell
            var actionCell = buildHTML('td');
            actionCell.appendChild(actionButton);

            // building up row from cells
            var row = buildHTML('tr');

            row.appendChild(idCell);
            row.appendChild(summaryCell);
            row.appendChild(totalTimeCell);
            row.appendChild(timeInputCell);
            row.appendChild(dateInputCell);
            row.appendChild(actionCell);

            return row;

        }






        /*
            Log time button
        */
        function logTimeClick (evt) {

            var issueId = evt.target.getAttribute('data-issue-id')
            var timeInput = document.querySelector('input[data-issue-id=' + issueId + ']');
            var dateString = document.querySelector('input[class=log-date-input][data-issue-id=' + issueId + ']').value;

            // validate time input
            if(!timeInput.value.match(/[0-9]{1,4}[wdhm]/g)){
                errorMessage('Time input in wrong format. You can specify a time unit after a time value "X", such as Xw, Xd, Xh or Xm, to represent weeks (w), days (d), hours (h) and minutes (m), respectively.');
                return;
            }
            else{
                // clear error messages
                errorMessage('');
            }

            JIRA.updateWorklog(issueId, timeInput.value, new Date(dateString))
            .then(function (data) {
                refreshWorklog(issueId);
            }, genericResponseError);

        }

        function refreshWorklog (issueId) {

            JIRA.getIssueWorklog(issueId)
            .then(onWorklogFetchSuccess, genericResponseError);

            function onWorklogFetchSuccess (response) {
                var worklogs = response.worklogs;
                var totalTimeSpent = document.querySelector('td[data-issue-id=' + issueId + ']');
                totalTimeSpent.innerText = sumWorklogs(worklogs);
            }

        }






        /* 
            Helper functions 
        */

        // html generator
        function buildHTML (tag, html, attrs) {

            var element = document.createElement(tag);

            if(html) element.innerHTML = html;

            for (attr in attrs) {
                if(attrs[attr] === false) continue;
                element.setAttribute(attr, attrs[attr]);
            }

            return element;
        }

        // Generic ajax error
        function genericResponseError (response, status, error) {
            var parsed = '';
            try{
                parsed = response;
            }catch(e){
                parsed = 'error';
            }
            if(Array.isArray(parsed.errorMessages)){
                errorMessage(parsed.errorMessages.join(' '));
            }else {
                errorMessage('Error: ' + status + ' - ' + error);
            }
        }

        // Popup error message
        function errorMessage (message) {
            var error = document.getElementById('error')
            error.innerText = message;
            error.style.display = 'block';
        }

        function setupLoader () {
            // Popup loading indicator
            var indicator = document.getElementById('loader-container');

            document.addEventListener('jiraStart', function () {
                indicator.style.display = 'block';
            }, false);

            document.addEventListener('jiraStop', function () {
                indicator.style.display = 'none';
            }, false);

        }


        // Date helper to pre-select today's date in the datepicker
        Date.prototype.toDateInputValue = (function() {
            var local = new Date(this);
            local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
            return local.toJSON().slice(0,10);
        });

    }

}

