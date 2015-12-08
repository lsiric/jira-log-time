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

        // mandatory fields check
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

        // Jira API instantiation
        var JIRA = JiraAPI(options.baseUrl, options.apiExtension, options.username, options.password, options.jql);

        // Global events listener for hiding/showing loading spinner
        setupLoader();

        // Fetch assigned issues
        JIRA.getAssignedIssues()
        .then(onFetchSuccess, genericResponseError);

        function onFetchSuccess (response) {

            var promises = [];

            var issues = response.issues;

            // fetch worklogs for every single issue
            issues.forEach(function (issue) {
                // queue all requests
                promises.push(getWorklog(issue.key, issues));
            });

            // when all worklogs are fetched, begin html interaction
            Promise.all(promises)
            .then(function () {
                // draw project title
                setProjectTitle(options.description);
                // draw html table with issues and worklogs 
                drawIssuesTable(issues);

            });

        }




        /*
            Worklog functions
        */

        // Issues are passed in so we can construct entire issue object with worklogs before we draw the html table
        function getWorklog (id, issues) {

            // Fetch worklog
            return JIRA.getIssueWorklog(id)
            .then(onWorklogFetchSuccess, genericResponseError);

            function onWorklogFetchSuccess (response) {

                issues.forEach(function (issue) {
                    if(issue.key === id){
                        issue.totalTime = sumWorklogs(response.worklogs);
                    } 
                });

            }

        }

        // Worklogs sum in 'jira format' (1w 2d 3h 44m)
        function sumWorklogs (worklogs) {

            // Sum all worklog times seconds
            var totalSeconds = worklogs.reduce(function(a, b){
                return {timeSpentSeconds: a.timeSpentSeconds + b.timeSpentSeconds}
            }, {timeSpentSeconds:0}).timeSpentSeconds;

            // Get how many weeks in totalSeconds
            var totalWeeks = Math.floor(totalSeconds / 144000);
            // Deduce weeks from totalSeconds
            totalSeconds = totalSeconds % 144000;
            // Get how many days in the rest of the totalSeconds
            var totalDays = Math.floor(totalSeconds / 28800);
            // Deduce days from totalSeconds
            totalSeconds = totalSeconds % 28800;
            // Get how many hours in the rest of the totalSeconds
            var totalHours = Math.floor(totalSeconds / 3600);
            // Deduce hours from totalSeconds
            totalSeconds = totalSeconds % 3600;
            // Get how many minutes in the rest of the totalSeconds
            var totalMinutes = Math.floor(totalSeconds / 60);

            // return it in 'nicely' formated Jira format
            return (totalWeeks ? totalWeeks + 'w' : '') + ' ' + (totalDays ? totalDays + 'd' : '') + ' ' + (totalHours ? totalHours + 'h' : '') + ' ' + (totalMinutes ? totalMinutes + 'm' : '');

        }






        /*
            HTML interaction
        */
 
        // Project title
        function setProjectTitle (projectName) {
            document.getElementById('project-name').innerText = projectName;
        }

        // Issues table
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
        // Refresh worklog row
        function refreshWorklog (issueId) {

            JIRA.getIssueWorklog(issueId)
            .then(onWorklogFetchSuccess, genericResponseError);

            function onWorklogFetchSuccess (response) {
                // update worklog sum
                var worklogs = response.worklogs;
                var totalTimeSpent = document.querySelector('td[data-issue-id=' + issueId + ']');
                totalTimeSpent.innerText = sumWorklogs(worklogs);
                // clear time input value
                var timeInput = document.querySelector('input[data-issue-id=' + issueId + ']');
                timeInput.value = '';
                // clear date input value
                var dateInput = document.querySelector('input[class=log-date-input][data-issue-id=' + issueId + ']');
                dateInput.value = new Date().toDateInputValue();
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

        // Simple Jira api error handling
        function genericResponseError (error) {

            var response = error.response || '';
            var status = error.status || '';
            var statusText  = error.statusText || '';

            if(response){
                try{
                    errorMessage(response.errorMessages.join(' ')); 
                }catch(e){
                    errorMessage('Error: ' + status + ' - ' + statusText);
                }                
            }else{
                errorMessage('Error: ' + status + ' ' + statusText);
            }

        }

        // Error message
        function errorMessage (message) {
            var error = document.getElementById('error')
            error.innerText = message;
            error.style.display = 'block';
        }

        // Loading spinner
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

