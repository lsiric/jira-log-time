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
        
        // Set project title in html
        setProjectTitle(options.description);

        // show loading spinner
        toggleIssuesLoading();

        // Fetch assigned issues
        JIRA.getAssignedIssues()
        .then(onFetchSuccess, genericResponseError);

        function onFetchSuccess (response) {

            var issues = response.issues;

            // create issues HTML table
            drawIssuesTable(issues);

            // hide loading spinner
            toggleIssuesLoading();

            // fetch worklogs for each issue
            issues.forEach(function (issue) {
                // asynchronously fetch and draw total worklog time
                refreshWorklog(issue.key);
            });

        }




        /****************
        Worklog functions
        ****************/

        // Fetech and refresh worklog row
        function refreshWorklog (issueId) {

            // get TD container and it's children
            var totalTimeContainer = document.querySelector('td[class="total-time-container"][data-issue-id="' + issueId + '"]');
            var totalTime = totalTimeContainer.lastChild;

            // toggle worklog loading spinner
            toggleWorklogLoading(totalTimeContainer);

            // fetch worklog
            JIRA.getIssueWorklog(issueId)
            .then(onWorklogFetchSuccess, genericResponseError);

            function onWorklogFetchSuccess (response) {
                // set total time
                totalTime.innerText = sumWorklogs(response.worklogs);
                // toggle worklog loading spinner
                toggleWorklogLoading(totalTimeContainer);
                // clear time input value
                var timeInput = document.querySelector('input[data-issue-id=' + issueId + ']');
                timeInput.value = '';
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






        /***************
        HTML interaction
        ****************/

        // Project title
        function setProjectTitle (projectName) {
            document.getElementById('project-name').innerText = projectName;
        }

        // Loading spinner
        function toggleIssuesLoading () {
            var loader = document.getElementById('loader-container');
            loader.style.display = loader.style.display == 'block' ?  'none' : 'block';
        }

        function toggleWorklogLoading (containerTd) {
            var loader = containerTd.firstChild;
            var totalTime = containerTd.lastChild;
            loader.style.display = loader.style.display == 'block' ?  'none' : 'block';
        }

        // Issues table
        function drawIssuesTable (issues) {

            var logTable = document.getElementById('jira-log-time-table');
            var tbody = buildHTML('tbody');

            issues.forEach(function (issue) {
                var row = generateLogTableRow(issue.key, issue.fields.summary);
                tbody.appendChild(row)
            });

            logTable.appendChild(tbody);

        }

        function generateLogTableRow (id, summary) {
            /*************
             Issue ID cell
            *************/ 
            var idCell = buildHTML('td', id, {
                class: 'issue-id'
            });
            
            /************
            Issue summary
            ************/
            var summaryCell = buildHTML('td', summary, {
                class: 'issue-summary truncate'
            });

            /***************
            Total spent time
            ***************/
            // summary loader
            var loader = buildHTML('div', null, {
                class: 'loader-mini'
            });
            // summary total time
            var totalTime = buildHTML('div', null, {
                class: 'issue-total-time-spent',
                'data-issue-id' : id
            });
            // Issue total worklog sum
            var totalTimeContainer = buildHTML('td', null, {
                class: 'total-time-container',
                'data-issue-id' : id
            });
            totalTimeContainer.appendChild(loader);
            totalTimeContainer.appendChild(totalTime);
            
            /*********
            Time input
            *********/
            var timeInput = buildHTML('input', null, {
                class: 'issue-time-input',
                'data-issue-id': id
            });
            // Time input cell
            var timeInputCell = buildHTML('td');
            timeInputCell.appendChild(timeInput);

            /*********
            Date input
            *********/
            var dateInput = buildHTML('input', null, {
                type: 'date',
                class: 'issue-log-date-input',
                value: new Date().toDateInputValue(),
                'data-issue-id': id
            });
            // Date input cell
            var dateInputCell = buildHTML('td');
            dateInputCell.appendChild(dateInput);

            /************
            Action button
            ************/
            var actionButton = buildHTML('input', null, {
                type: 'button',
                value: 'Log Time',
                class: 'issue-log-time-btn',
                'data-issue-id': id
            });

            actionButton.addEventListener('click', logTimeClick);

            // Action button cell
            var actionCell = buildHTML('td');
            actionCell.appendChild(actionButton);

            /********
            Issue row
            ********/
            var row = buildHTML('tr', null, {
                'data-issue-id': id
            });

            row.appendChild(idCell);
            row.appendChild(summaryCell);
            row.appendChild(totalTimeContainer);
            row.appendChild(timeInputCell);
            row.appendChild(dateInputCell);
            row.appendChild(actionCell);

            return row;

        }






        /*
            Log time button
        */
        function logTimeClick (evt) {

            // clear error messages
            errorMessage('');

            // get issue ID
            var issueId = evt.target.getAttribute('data-issue-id')

            // find it's row
            var issueRow = document.querySelector('tr[data-issue-id=' + issueId + ']');
            // find row time input
            var timeInput = issueRow.querySelector('input[data-issue-id=' + issueId + ']');
            // find row date input
            var dateInput = issueRow.querySelector('input[class=issue-log-date-input][data-issue-id=' + issueId + ']');
            // find row total time loader
            var totalTimeLoading = issueRow.querySelector('div[class="loader-mini"]');
            // find row total time
            var totalTime = issueRow.querySelector('div[class="issue-total-time-spent"][data-issue-id=' + issueId + ']');

            // validate time input
            if(!timeInput.value.match(/[0-9]{1,4}[wdhm]/g)){
                errorMessage('Time input in wrong format. You can specify a time unit after a time value "X", such as Xw, Xd, Xh or Xm, to represent weeks (w), days (d), hours (h) and minutes (m), respectively.');
                return;
            }

            // show loading
            totalTimeLoading.style.display = 'block';
            // hide time input
            totalTime.style.display = 'none';

            JIRA.updateWorklog(issueId, timeInput.value, new Date(dateInput.value))
            .then(function (data) {
                refreshWorklog(issueId);
            }, genericResponseError);

        }






        /***************
        Helper functions 
        ***************/
        // html generator
        function buildHTML (tag, html, attrs) {

            var element = document.createElement(tag);
            // if custom html passed in, append it
            if(html) element.innerHTML = html;

            // set each individual attribute passed in
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

        // UI error message
        function errorMessage (message) {
            var error = document.getElementById('error')
            error.innerText = message;
            error.style.display = 'block';
        }

        // Date helper to pre-select today's date in the datepicker
        Date.prototype.toDateInputValue = (function() {
            var local = new Date(this);
            local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
            return local.toJSON().slice(0,10);
        });

        // Listen to global events and show loading spiner
        // ** NOT USED AT THE MOMENT **
        function initLoader () {
            // Popup loading indicator
            var indicator = document.getElementById('loader-container');

            document.addEventListener('jiraStart', function () {
                indicator.style.display = 'block';
            }, false);

            document.addEventListener('jiraStop', function () {
                indicator.style.display = 'none';
            }, false);

        }

    }

}

