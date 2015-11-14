// Saves options to chrome.storage.sync.
function save_options() {
  var description = document.getElementById('description').value;
  var jiraUrl = document.getElementById('jiraUrl').value;
  var username = document.getElementById('username').value;
  var password = document.getElementById('password').value;
  chrome.storage.sync.set({
    description: description,
    jiraUrl: jiraUrl,
    username: username,
    password: password
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
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
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);