var albumID = null;
var retry = true;
var alerts = document.getElementById("alerts");

// Saves options to chrome.storage
function save_options() {
  var album = document.getElementById('albums').selectedOptions[0];
  chrome.storage.sync.set({
    albumName: album.innerText,
    albumID: album.value
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.innerText = "Options saved.";
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });

  alerts.innerHTML = "";
  restore_options();
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get({
    albumName: null,
    albumID: null
  }, function(items) {
    var option = document.querySelector("[value=\"" + items.albumID + "\"]");

    if (option == null) {
      alerts.insertAdjacentHTML("afterBegin", "<p>Please select an album and save</p>");
      option = document.getElementsByTagName("option")[0];
    }

    option.setAttribute("selected", "selected");
  });
}

function getAlbums() {
  chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://picasaweb.google.com/data/feed/api/user/default?alt=json");
    xhr.setRequestHeader('Authorization',
                         'Bearer ' + token);
    xhr.responseType = "json";

    xhr.onload = function() {
      if (this.status === 401 && retry) {
        // This status may indicate that the cached
        // access token was invalid. Retry once with
        // a fresh token.
        console.log("invalid");
        retry = false;
        chrome.identity.removeCachedAuthToken(
            { 'token': token },
            getAlbums);
        return;
      } else {
        var albums = this.response.feed.entry;
        var albumSelect = document.getElementById("albums");

        for (i = 0; i < albums.length; i++) {
          var option = document.createElement("option");
          option.setAttribute("value", albums[i].gphoto$id.$t);
          option.innerText = albums[i].title.$t;
          albumSelect.appendChild(option);
        }

        restore_options();
      }
    }
    xhr.send();
  });
}

document.addEventListener('DOMContentLoaded', getAlbums());
document.getElementById('save').addEventListener('click', save_options);
