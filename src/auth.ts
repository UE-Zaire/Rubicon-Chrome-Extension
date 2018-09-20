chrome.browserAction.onClicked.addListener(function() {
  chrome.tabs.create({ url: 'http://ec2-18-221-91-190.us-east-2.compute.amazonaws.com' });
});
