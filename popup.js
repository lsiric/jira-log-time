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



    /*************
    Initialization
    *************/

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

        // show main loading spinner
        toggleVisibility('div[id=loader-container]');

        // fetch issues
        JIRA.getIssues()
        .then(onFetchSuccess, onFetchError);

        function onFetchSuccess (response) {

            var issues = response.issues;

            // create issues HTML table
            drawIssuesTable(issues);

            // hide main loading spinner
            toggleVisibility('div[id=loader-container]');

            // asynchronously fetch and draw total worklog time
            issues.forEach(function (issue) {
                getWorklog(issue.key);
            });

        }

        function onFetchError (error) {
            // hide main loading spinner
            toggleVisibility('div[id=loader-container]');
            genericResponseError(error);
        }



        /****************
        Worklog functions
        ****************/

        // Fetch and refresh worklog row
        function getWorklog (issueId) {

            // total time and it's acompanying loader are in the same td, so we can use previousSibling
            var totalTime = document.querySelector('div[class="issue-total-time-spent"][data-issue-id="' + issueId + '"]');
            var loader = totalTime.previousSibling;

            // hide worklog time and show loading
            totalTime.style.display = 'none';
            loader.style.display = 'block';

            // fetch worklog
            JIRA.getIssueWorklog(issueId)
            .then(onWorklogFetchSuccess, onWorklogFetchError);

            function onWorklogFetchSuccess (response) {
                // set total time
                totalTime.innerText = sumWorklogs(response.worklogs);
                // show worklog time and hide loading
                totalTime.style.display = 'block';
                loader.style.display = 'none';
                // clear time input value
                var timeInput = document.querySelector('input[data-issue-id=' + issueId + ']');
                timeInput.value = '';
            }

            function onWorklogFetchError (error) {
                // show worklog time and hide loading inspite the error
                totalTime.style.display = 'block';
                loader.style.display = 'none';
                genericResponseError(error);
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

        function toggleVisibility (query) {
            var element = document.querySelector(query);
            element.style.display = element.style.display == 'block' ?  'none' : 'block';
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

        // generate all html elements for issue table
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
                class: 'loader-mini',
                'data-issue-id' : id
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



        /********************
        Log time button click
        ********************/

        function logTimeClick (evt) {

            // clear any error messages
            errorMessage('');

            // get issue ID
            var issueId = evt.target.getAttribute('data-issue-id')

            // time input
            var timeInput = document.querySelector('input[data-issue-id=' + issueId + ']');
            // date input
            var dateInput = document.querySelector('input[class=issue-log-date-input][data-issue-id=' + issueId + ']');

            // validate time input
            if(!timeInput.value.match(/[0-9]{1,4}[wdhm]/g)){
                errorMessage('Time input in wrong format. You can specify a time unit after a time value "X", such as Xw, Xd, Xh or Xm, to represent weeks (w), days (d), hours (h) and minutes (m), respectively.');
                return;
            }

            // hide total time and show loading spinner;
            toggleVisibility('div[class="issue-total-time-spent"][data-issue-id=' + issueId + ']');
            toggleVisibility('div[class="loader-mini"][data-issue-id=' + issueId + ']');

            JIRA.updateWorklog(issueId, timeInput.value, new Date(dateInput.value))
            .then(function (data) {
                getWorklog(issueId);
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

        // Listen to global events and show/hide main loading spiner
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

