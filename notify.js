var notificationsAreaId = "simplNotificationsArea";
var notificationsArea = null;
var timers = {};

function initNotificationsArea() {
  notificationsArea = document.getElementById(notificationsAreaId);

  if (notificationsArea == null) {
    notificationsArea = document.createElement("div");
    notificationsArea.setAttribute("id", notificationsAreaId);
    notificationsArea.setAttribute("class", "simpl-notifications-area");
    document.body.appendChild(notificationsArea);
  }
}

function addNotification(imageUrl, fileName, notificationText) {
  initNotificationsArea();

  var wrapper = document.getElementById("simpl-" + fileName);

  if (wrapper == null) {
    wrapper = document.createElement("div");
    wrapper.setAttribute("id", "simpl-" + fileName);

    var img = document.createElement("img");
    img.setAttribute("src", imageUrl);

    var notificationP = document.createElement("p");
    notificationP.innerText = notificationText;

    wrapper.appendChild(img);
    wrapper.appendChild(notificationP);

    notificationsArea.insertAdjacentElement("afterBegin", wrapper);
  } else {
    // already exists, update text and reset timeout
    var notificationP = wrapper.getElementsByTagName("p")[0];
    notificationP.innerText = notificationText;
  }

  clearTimeout(timers[fileName]);
  clearTimeout(timers[fileName + "-remove"]);
  setForRemoval(wrapper, fileName);
}

function setForRemoval(element, fileName) {
  timers[fileName] = window.setTimeout(function() {
    element.className = "fade";
    timers[fileName + "-remove"] = window.setTimeout(function() {
      element.remove();
    }, 2000);
  }, 10000);
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.state == "PROGRESS") {
    addNotification(message.imageUrl, message.fileName, ("Uploading... (" + message.progress + "%)"));
    sendResponse({});
  } else {
    if (message.imageUrl) {
      addNotification(message.imageUrl, message.fileName, "Image saved");
      sendResponse({});
    }
  }
});
