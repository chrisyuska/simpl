// Copyright (c) 2015 Chris Yuska.  All rights reserved.
// TODO: license

var albumName, albumID = null;
var retry = true;

chrome.storage.sync.get({albumName: null, albumID: null}, function(items) {
  albumName = items.albumName;
  albumID = items.albumID;
});

chrome.storage.onChanged.addListener(function(changes, areaName) {
  if (changes.albumName) {
    albumName = changes.albumName.newValue;
  }
  if (changes.albumID) {
    albumID = changes.albumID.newValue;
  }
});

/*
 * Create context menu for saving image to pre-determined google plus album
 */
chrome.contextMenus.create({
  "title": "Save image to G+ Album",
  "id": "simpl-image-save",
  "type": "normal",
  "contexts": ["image"]
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  retry = true;

  if (albumID == null) {
    chrome.tabs.create({url: "options.html"});
    return;
  }

  console.log("Saving " + info.srcUrl + " to " + albumName + " album...");

  var xhr = new XMLHttpRequest();
  xhr.open("GET", info.srcUrl);
  xhr.responseType = "blob";
  xhr.onload = function(e) {
    if (this.status == 200) {
      var blob = this.response;
      uploadImage(info.srcUrl, blob, tab);
    }
  };
  xhr.send();
});

function uploadImage(imageUrl, imageBlob, tab) {
    chrome.identity.getAuthToken({ 'interactive': true }, function(token) {

    //var image  = new Image();
    //image.src = imageUrl;
    var fileName = imageUrl.substring(imageUrl.lastIndexOf('/')+1);
    var formData = new FormData();
    formData.append(fileName, imageBlob);

    xhr = new XMLHttpRequest();
    xhr.open("POST", "https://picasaweb.google.com/data/feed/api/user/default/albumid/" + albumID + "?alt=json");
    xhr.responseType = "json";
    xhr.setRequestHeader("Slug", fileName);
    xhr.setRequestHeader('Authorization',
                         'Bearer ' + token);

    xhr.upload.onprogress = function(e) {
      if (e.lengthComputable) {
        chrome.tabs.sendMessage(tab.id, {
          state: "PROGRESS",
          imageUrl: imageUrl,
          fileName: fileName,
          progress: Math.round((e.loaded / e.total) * 100)
        }, function(response) {
          console.log("Upload in progress");
        });
      }
    };

    xhr.onload = function () {
      if (this.status === 401 && retry) {
        // This status may indicate that the cached
        // access token was invalid. Retry once with
        // a fresh token.
        retry = false;
        chrome.identity.removeCachedAuthToken(
            { 'token': token },
            getTokenAndUpload);
        return;
      }

      chrome.tabs.sendMessage(tab.id, {
        state: "COMPLETE",
        imageUrl: imageUrl,
        fileName: fileName,
        uploadStatus: this.status
      }, function(response) {
        console.log("Upload complete");
      });

      var viewLink = this.response.entry.link.filter(function(i) { return i.rel == "alternate"; })[0];
      if (viewLink) {
        chrome.tabs.create({url: viewLink.href});
      }
    }
    xhr.send(imageBlob);
  });
}

function imageUploadCallback(error, httpStatus, responseText) {
  if (error != null) {
    console.log("Error uploading: " + responseText);
  }
}

function authenticatedXhr(method, url, callback) {
  var retry = true;
  function getTokenAndXhr() {
    chrome.identity.getAuthToken({/* details */},
                                 function (access_token) {
      if (chrome.runtime.lastError) {
        callback(chrome.runtime.lastError);
        return;
      }

      var xhr = new XMLHttpRequest();
      xhr.open(method, url);
      xhr.setRequestHeader('Authorization',
                           'Bearer ' + access_token);

      xhr.onload = function () {
        if (this.status === 401 && retry) {
          // This status may indicate that the cached
          // access token was invalid. Retry once with
          // a fresh token.
          retry = false;
          chrome.identity.removeCachedAuthToken(
              { 'token': access_token },
              getTokenAndXhr);
          return;
        }

        callback(null, this.status, this.responseText);
      }
    });
  }
}
