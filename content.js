chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
	if (request.message == "get performance"){
		sendResponse({fromTab: performance.timing});
	}
});
