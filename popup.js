document.addEventListener('DOMContentLoaded', onDOMLoaded, false);



function getCredentials () {

    chrome.storage.sync.get({
        description: '',
        jiraUrl: '',
        username: '',
        password: ''
        }, function(items) {

        document.getElementById('description').value = items.description;
        document.getElementById('jiraUrl').value = items.jiraUrl;
        document.getElementById('username').value = items.username;
        document.getElementById('password').value = items.password;

    });
        
}


function onDOMLoaded () {


  // var checkPageButton = document.getElementById('checkPage');
  // checkPageButton.addEventListener('click', function() {

  //   chrome.tabs.getSelected(null, function(tab) {
  //     d = document;

  //     var f = d.createElement('form');
  //     f.action = 'http://gtmetrix.com/analyze.html?bm';
  //     f.method = 'post';
  //     var i = d.createElement('input');
  //     i.type = 'hidden';
  //     i.name = 'url';
  //     i.value = tab.url;
  //     f.appendChild(i);
  //     d.body.appendChild(f);
  //     f.submit();
  //   });
  // }, false);



    var username = 'cs.tropic@gmail.com';
    var password = 'Creative1';
    var description = 'tralala';
    var baseUrl = 'http://192.168.99.100:32768';
    var apiExtension = '/rest/api/2';

    // var jira = JiraAPI(baseUrl, apiExtension, username, password);

    // jira.getAssignedIssues()
    // .success(function (data) {
    //     console.log('success');
    // })
    // .error(function (error) {
    //     console.log(error);
    // });

    fetchOpenIssues(username, password)
    .success(function (data) {
        
        var container = document.getElementById('issues');

        for (var i = 0; i < data.issues.length; i++) {

            var issue = data.issues[i];
            var summary = issue.fields.summary;
            var id = issue.key;

            var br = document.createElement('br');
            var div = document.createElement('div');
            div.id = id;

            div.innerText = summary + ' [' + issue.key + ']';

            container.appendChild(div);

            addTotalTimeSpentToForm(username, password, id);

            // var input = document.createElement('input');
            // container.appendChild(input);

            var button = document.createElement('button');
            button.value = id;
            button.innerText = 'Add 2h';

            addClickFunction(username, password, button, id);

            container.appendChild(button);

            container.appendChild(br);

        };

    })
    .error(function (error) {
        console.log(error);
    });


    function addClickFunction (username, password, button, id) {

        button.addEventListener('click', function (evt) {
           updateWorklog(username, password, id)
           .success(function (data) {
               console.log(data);
           })
           .error(function (error) {
               console.log(error);
           });
        });

    }



    function updateWorklog (username, password, id) {

        var parameters = {
            fields : {
                "started": new Date().toISOString().replace('Z', '+0530'), // TODO: Problems with the timezone, investigate
                "timeSpent": "2d"
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

    /*

    "timeSpent": "1h 30m",
    "started": "2013-09-01T10:30:18.932+0530",
    "comment": "logging via powershell"

    */



    function addTotalTimeSpentToForm (username, password, id) {
        getWorklog(username, password, id)
        .success(function methodName (data) {

            var div = document.getElementById(id);

            div.innerText += ' : ';

            var text = '';
            for (var j = 0; j < data.worklogs.length; j++) {
                text += data.worklogs[j].timeSpent + ' ';
            };

            div.innerText += text;

        })
        .error(function (error) {
            console.log(error);
        });
    }



    function sumWorklogs (worklogs) {
        for (var j = 0; j < worklogs.length; j++) {
            var worklog = worklogs[j];

        };
    }


    function getWorklog (username, password, id, container) {

        return $.ajax({
            type: 'GET',
            url: 'http://192.168.99.100:32768/rest/api/2/issue/' + id + '/worklog',
            headers: {
             //   'Authorization': 'Basic ' + btoa(username + ':' + password),
                'Content-Type': 'application/json'
            },
            contentType: 'application/json',
            dataType: 'json'
        });

    }

    function fetchOpenIssues (username, password) {

        return $.ajax({
            type: 'GET',
            url: 'http://192.168.99.100:32768/rest/api/2/search?jql=assignee=cs.tropic\\u0040gmail.com',
            headers: {
                'Authorization': 'Basic ' + btoa(username + ':' + password),
                'Content-Type': 'application/json'
            },
            contentType: 'application/json',
            dataType: 'json'
        });

    }

    function jqueryLogin(username, password) {

      $.ajax({
         url: 'http://192.168.99.100:32768/rest/api/2/user?username=' + username,
         data: {
            format: 'json'
         },
         headers: {
          'Authorization': 'Basic ' + btoa(username + ':' + password)
         },
         error: function() {
            $('#info').html('<p>An error has occurred</p>');
         },
         contentType: 'application/json',
         dataType: 'json',
         success: function(data) {
            console.log(data);
         },
         type: 'GET'
      });

    };

    function querystring_from_params(params) {
        var querystring = '';
        if (params) {
            var arr = [];
            for (var param in params) {
                arr.push(param + '=' + params[param]);
            }
            querystring = arr.length > 0 ? '?' + arr.join('&') : '';
        }
        return querystring;
    }


}