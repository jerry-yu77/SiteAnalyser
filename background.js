var tabs = {};
loadTime = null;

//listening for requests on all tabs
chrome.webRequest.onCompleted.addListener(function (details){
	if (details.tabId != -1){
		if (tabs[details.tabId]==null){
			tabs[details.tabId] = [[details], details.timeStamp];
			message = [details, details.timeStamp];
			chrome.runtime.sendMessage({fromBG: message});
		}else{
			tabs[details.tabId][0].push(details);
			if((details.timeStamp - tabs[details.tabId][1]) < 2000){
				loadTime = details.timeStamp;
				tabs[details.tabId][1] = details.timeStamp;
			}else{
				loadTime = tabs[details.tabId][1];
			}
			message = [details, loadTime];
			chrome.runtime.sendMessage({fromBG: message});
		}
	}
},
{urls: ["<all_urls>"]}, 
["responseHeaders"]);

//changing tabs
chrome.tabs.onActivated.addListener(function (tab) {
	console.log("Changed tab ID: "+tab.tabId);
	if (tabs[tab.tabId]==null){
		console.log("In tabs: "+tabs[tab.tabId]);
		console.log("refresh the page to get assets");
	}else{
		console.log("In tabs: "+tabs[tab.tabId][0]);
		console.log("Assets in this tab: "+tabs[tab.tabId][0].length);
	}
});

//url change
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	//reset tab assets to 0 on URL change
	if (changeInfo.status == "loading"){
		tabs[tabId]=null;
		//send message to popup to reset count variables
		chrome.runtime.sendMessage({fromBG: "reset"});
	}
});

//closing tab
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo){
	delete tabs[tabId];
});

//listening to popup requests
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
	if (request.sentTabId){
		if (tabs[request.sentTabId]!=null){
			for (i = 0; i < tabs[request.sentTabId][0].length; i++){
				details = tabs[request.sentTabId][0][i]
				loadTime = tabs[request.sentTabId][1];
				message = [details, loadTime];

				//sending details to popups
				chrome.runtime.sendMessage({fromBG: message});

				// for (var j = 0; j < details.responseHeaders.length; j++) {
			 //  	if((details.responseHeaders[j].name).toLowerCase() == "content-type"){
			 //  		console.log("Response Header: "+details.responseHeaders[j].name+": "+details.responseHeaders[j].value);
			 //  	}
			 //  };
			}
		}
		else{
			alert("Refresh the page to get statistics");
		}
	}
});