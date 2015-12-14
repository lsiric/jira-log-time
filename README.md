# Jira Log Time Chrome plugin

Code repo for [Jira Log Time](https://chrome.google.com/webstore/detail/jira-log-time/peboekgeiffcaddndeonkmkledekeegl) chrome plugin.

Thanks to [Oliver Debenc](https://www.linkedin.com/in/oliver-debenc-01821770) for the design

## Options

### Description

Label which will be presented at the top

### URL 

This is your Jira server URL. Copy entire url, with protocol and port (if not default).

### REST Api Extension

This is your Jira server REST Api version. Default value is `/rest/api/2` because that is the default extension for most recent jira. 

If you are using older server of Jira it might be `/rest/api/1`.

### Username

Your Jira username.

### Password

Your Jira password.

### JQL - Jira Query Language

JQL which will be used to display all items which are available to log time. 
Default option is `assignee=currentUser()`, which will display all issues assigned to you. 

If you are not familiar with JQL, you can go to Jira and adjust all basic filters. Then switch to Advanced mode and just copy generated JQL to this field.