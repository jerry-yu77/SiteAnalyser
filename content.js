//listening to popup requests
chrome.runtime.onMessage.addListener(handlePopupRequest);

function handlePopupRequest(request, sender, sendResponse){
	if (request.message == "get performance"){
		sendResponse({fromTab: performance.timing});
	}
}
