var tabs = {};
var loadTime = null;

//listening for requests on all tabs
chrome.webRequest.onCompleted.addListener(handleAllRequests,{urls: ["<all_urls>"]},["responseHeaders"]);

//changing tabs
chrome.tabs.onActivated.addListener(handleTabChange);

//url change
chrome.tabs.onUpdated.addListener(handleURLChange);

//closing tab
chrome.tabs.onRemoved.addListener(handleTabClose);

//listening to popup requests
chrome.runtime.onMessage.addListener(handlePopupRequest);

function handleAllRequests(details){
	if (details.tabId != -1){
		if (tabs[details.tabId]==null){
			tabs[details.tabId] = [[details], details.timeStamp];
			var message = [details, details.timeStamp];
			chrome.runtime.sendMessage({fromBG: message});
		}else{
			tabs[details.tabId][0].push(details);
			if((details.timeStamp - tabs[details.tabId][1]) < 2000){
				loadTime = details.timeStamp;
				tabs[details.tabId][1] = details.timeStamp;
			}else{
				loadTime = tabs[details.tabId][1];
			}
			var message = [details, loadTime];
			chrome.runtime.sendMessage({fromBG: message});
		}
	}
};

function handleTabChange(tab){
	console.log("Changed tab ID: "+tab.tabId);
};

function handleURLChange(tabId, changeInfo, tab){
	//reset tab assets to 0 on URL change
	if (changeInfo.status == "loading"){
		tabs[tabId]=null;
		//send message to popup to reset count variables
		chrome.runtime.sendMessage({fromBG: "reset"});
	}
};

function handleTabClose(tabId, removeInfo){
	delete tabs[tabId];
}

function handlePopupRequest(request, sender, sendResponse){
	if (request.sentTabId){
		if (tabs[request.sentTabId]!=null){
			for (i = 0; i < tabs[request.sentTabId][0].length; i++){
				var details = tabs[request.sentTabId][0][i]
				loadTime = tabs[request.sentTabId][1];
				var message = [details, loadTime];

				//sending details to popups
				chrome.runtime.sendMessage({fromBG: message});
			}
		}
		else{
			alert("Refresh the page to get statistics");
		}
	}
};